// Deno 기반 Supabase Edge Function: send-push
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// VAPID 설정 (Edge Function Env에 주입해야 함)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:ssrabw@gmail.com";

// Deno 환경에서 에러 방지를 위해 VAPID 설정 초기화
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req) => {
  // CORS 프리플라이트 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    const payload = await req.json();
    console.log("[Send-Push-Trigger] 웹훅 페이로드 수신:", JSON.stringify(payload));

    const { type, table, record, old_record } = payload;
    if (!type || !table || !record) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Supabase 클라이언트 생성 (RLS를 우회하여 push_subscriptions 및 customers 테이블을 읽기 위해 service_role 사용)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let title = "";
    let body = "";
    let targetRole: "admin" | "customer" | "" = "";
    let targetPhone = "";

    // 1) 새 주문이 들어왔을 때 -> 어드민 전체에게 푸시 알림 전송
    if (type === "INSERT" && table === "orders") {
      const phone = record.customer_phone;
      const price = record.total_price;

      // 상호명 조회
      const { data: customer } = await supabase
        .from("customers")
        .select("shop_name")
        .eq("phone", phone)
        .maybeSingle();

      const shopName = customer ? customer.shop_name : phone;
      title = "새 주문 접수 🔔";
      body = `${shopName}님의 새 도매 주문이 접수되었습니다!\n금액: ${price.toLocaleString()}원`;
      targetRole = "admin";
    }
    // 2) 주문 상태가 '포장 완료'로 변경되었을 때 -> 해당 고객에게 푸시 알림 전송
    else if (type === "UPDATE" && table === "orders") {
      const newStatus = record.status;
      const oldStatus = old_record?.status;

      if (newStatus === "포장 완료" && oldStatus !== "포장 완료") {
        title = "민들레 도매";
        body = "주문하신 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.";
        targetPhone = record.customer_phone;
        targetRole = "customer";
      }
    }
    // 3) 미송 주문 상태가 '미송포장완료'로 변경되었을 때 -> 해당 고객에게 푸시 알림 전송
    else if (type === "UPDATE" && table === "misong_orders") {
      const newStatus = record.status;
      const oldStatus = old_record?.status;

      if (newStatus === "미송포장완료" && oldStatus !== "미송포장완료") {
        title = "민들레 도매 (미송 완료)";
        body = "미송 주문 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.";
        targetPhone = record.customer_phone;
        targetRole = "customer";
      }
    }

    // 타겟이 설정되지 않은 변경 건은 그냥 통과
    if (!targetRole) {
      return new Response(JSON.stringify({ message: "No action required for this event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 대상이 되는 기기 구독 토큰 조회
    let query = supabase.from("push_subscriptions").select("*");
    if (targetRole === "admin") {
      query = query.eq("role", "admin");
    } else if (targetRole === "customer" && targetPhone) {
      query = query.eq("customer_phone", targetPhone).eq("role", "customer");
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Send-Push] 발송 대상 구독 정보가 존재하지 않습니다. (role: ${targetRole}, phone: ${targetPhone})`);
      return new Response(JSON.stringify({ message: "No target subscriptions found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`[Send-Push] 푸시 전송 대상 발견: ${subscriptions.length}개 기기`);

    // 비동기 알림 발송 처리
    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({ title, body })
        );
        console.log(`[Send-Push] 푸시 전송 완료 (Endpoint: ${sub.endpoint.slice(0, 40)}...)`);
      } catch (err: any) {
        console.error(`[Send-Push] 푸시 전송 오류 (Endpoint: ${sub.endpoint.slice(0, 40)}...):`, err);
        // 만약 푸시 서비스가 410(Gone) 또는 404(Not Found)를 반환하면 구독 만료 기기이므로 DB에서 삭제 처리
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Send-Push] 만료된 구독 기기 자동 삭제 완료 (Endpoint: ${sub.endpoint.slice(0, 40)}...)`);
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ success: true, sentCount: subscriptions.length }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err: any) {
    console.error("[Send-Push-Error] 치명적 에러 발생:", err);
    return new Response(JSON.stringify({ error: err.message || JSON.stringify(err) }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});

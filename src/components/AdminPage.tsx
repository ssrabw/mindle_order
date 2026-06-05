import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';

interface VariantInput {
  colorName: string;
  imageUrl: string;
  isUploading: boolean;
  error?: string;
}

interface ProductFromDb {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  main_images: string[];
  is_visible: boolean;
  is_deleted?: boolean;
  created_at: string;
}

interface VariantFromDb {
  id: string;
  product_id: number;
  color_name: string;
  image: string;
  is_visible: boolean;
}

interface InlineVariantInput {
  colorName: string;
  imageUrl: string;
  isUploading: boolean;
  progress: string;
}

// Cookie Helpers
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + (window.location.protocol === 'https:' ? '; Secure' : '');
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; SameSite=Lax' + (window.location.protocol === 'https:' ? '; Secure' : '');
};

export default function AdminPage() {


  // Authentication State
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Tab State: 'manage' | 'register' | 'trash'
  const [activeTab, setActiveTab] = useState<'manage' | 'register' | 'trash'>('manage');

  // DB Products and Variants for Management
  const [dbProducts, setDbProducts] = useState<ProductFromDb[]>([]);
  const [dbVariants, setDbVariants] = useState<VariantFromDb[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [editingPriceProductId, setEditingPriceProductId] = useState<number | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');

  // Inline inputs for adding variants (key is product_id)
  const [inlineVariantInputs, setInlineVariantInputs] = useState<Record<number, InlineVariantInput>>({});

  // Main Images Edit Modal State
  const [editingProductImages, setEditingProductImages] = useState<ProductFromDb | null>(null);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState<boolean>(false);
  const [tempMainImages, setTempMainImages] = useState<string[]>([]);
  const [isUploadingTempImage, setIsUploadingTempImage] = useState<boolean>(false);
  const [tempUploadProgress, setTempUploadProgress] = useState<string>('');

  // Product ID (Generated on load/reset as a 5-digit number)
  const [productId, setProductId] = useState<number>(() => Math.floor(10000 + Math.random() * 90000));

  // Product Form States
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('스카프');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Main Images States
  const [mainImageUrls, setMainImageUrls] = useState<string[]>([]);
  const [isMainUploading, setIsMainUploading] = useState<boolean>(false);
  const [mainUploadProgress, setMainUploadProgress] = useState<string>('');

  // Variants (Color options) States
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [isVarUploading, setIsVarUploading] = useState<boolean>(false);
  const [varUploadProgress, setVarUploadProgress] = useState<string>('');

  // General Register State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch DB Products and Variants
  const fetchProductsAndVariants = async () => {
    setIsLoadingDb(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantsError) throw variantsError;

      setDbProducts(productsData || []);
      setDbVariants(variantsData || []);
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // 1. Session verification on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const hasCookie = getCookie('admin_auth') === 'true';
        if (!hasCookie) {
          setIsAuthenticated(false);
          setIsVerifyingSession(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active Supabase Auth session. Clearing cookie.');
          deleteCookie('admin_auth');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Session verify error:', err);
        setIsAuthenticated(false);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifyAuth();
  }, []);

  // 2. Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'manage' || activeTab === 'trash')) {
      fetchProductsAndVariants();
    }
  }, [isAuthenticated, activeTab]);

  // Product visibility toggle
  const handleToggleProductVisibility = async (productId: number, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_visible: !currentVisibility })
        .eq('id', productId);

      if (error) throw error;

      setDbProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_visible: !currentVisibility } : p))
      );
    } catch (err: any) {
      alert(`상품 노출 상태 변경 중 오류: ${err.message}`);
    }
  };

  // Product deletion (Soft Delete)
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (
      !confirm(
        `정말로 "${productName}" 상품을 삭제하시겠습니까?\n이 작업은 일반 사용자 화면에서 상품을 보이지 않게 처리(블라인드)합니다.`
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', productId);

      if (error) throw error;

      setDbProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_deleted: true } : p))
      );
      alert('상품이 삭제 처리되었습니다. 삭제된 상품 탭에서 확인하실 수 있습니다.');
    } catch (err: any) {
      alert(`상품 삭제 중 오류: ${err.message}`);
    }
  };

  // Product restoration
  const handleRestoreProduct = async (productId: number, productName: string) => {
    if (
      !confirm(
        `"${productName}" 상품을 복원하시겠습니까?\n복원 후에는 쇼핑몰 노출 설정에 따라 사용자에게 다시 노출됩니다.`
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: false })
        .eq('id', productId);

      if (error) throw error;

      setDbProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_deleted: false } : p))
      );
      alert('상품이 성공적으로 복원되었습니다.');
    } catch (err: any) {
      alert(`상품 복원 중 오류: ${err.message}`);
    }
  };

  // Save edited product price to DB
  const handleSavePrice = async (productId: number) => {
    const parsedPrice = parseInt(newPriceValue.trim());
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ price: parsedPrice })
        .eq('id', productId);

      if (error) throw error;

      setDbProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, price: parsedPrice } : p))
      );
      setEditingPriceProductId(null);
      setNewPriceValue('');
    } catch (err: any) {
      console.error('가격 수정 에러:', err);
      alert(`가격 수정 중 오류: ${err.message}`);
    }
  };

  // Variant visibility toggle
  const handleToggleVariantVisibility = async (variantId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ is_visible: !currentVisibility })
        .eq('id', variantId);

      if (error) throw error;

      setDbVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, is_visible: !currentVisibility } : v))
      );
    } catch (err: any) {
      alert(`옵션 노출 상태 변경 중 오류: ${err.message}`);
    }
  };

  // Variant deletion
  const handleDeleteVariant = async (variantId: string, colorName: string) => {
    if (!confirm(`⚠️ 정말로 "${colorName}" 옵션을 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase.from('product_variants').delete().eq('id', variantId);

      if (error) throw error;

      setDbVariants((prev) => prev.filter((v) => v.id !== variantId));
      alert('옵션이 삭제되었습니다.');
    } catch (err: any) {
      alert(`옵션 삭제 중 오류: ${err.message}`);
    }
  };

  // Helper functions for inline inputs
  const getInlineInput = (productId: number): InlineVariantInput => {
    return inlineVariantInputs[productId] || { colorName: '', imageUrl: '', isUploading: false, progress: '' };
  };

  const updateInlineInput = (productId: number, fields: Partial<InlineVariantInput>) => {
    setInlineVariantInputs((prev) => ({
      ...prev,
      [productId]: {
        ...getInlineInput(productId),
        ...fields,
      },
    }));
  };

  // Inline Image Upload
  const handleInlineVariantImageChange = async (productId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateInlineInput(productId, { isUploading: true, progress: '업로드 중...' });

    try {
      const customName = `prod_${productId}_option_inline_${Date.now()}`;
      const url = await uploadToImgBB(file, customName);
      updateInlineInput(productId, { imageUrl: url, isUploading: false, progress: '' });
    } catch (err: any) {
      alert(`이미지 업로드 중 오류: ${err.message || err}`);
      updateInlineInput(productId, { isUploading: false, progress: '' });
    } finally {
      e.target.value = '';
    }
  };

  // Add Inline Variant
  const handleAddInlineVariant = async (productId: number) => {
    const input = getInlineInput(productId);
    if (!input.colorName.trim()) return alert('색상명을 입력해주세요.');
    if (!input.imageUrl) return alert('이미지를 업로드해주세요.');

    const nextOptId = `${productId}-opt-${Date.now()}`;

    try {
      const { data, error } = await supabase
        .from('product_variants')
        .insert({
          id: nextOptId,
          product_id: productId,
          color_name: input.colorName.trim(),
          image: input.imageUrl,
          is_visible: true,
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setDbVariants((prev) => [...prev, data[0] as VariantFromDb]);
        updateInlineInput(productId, { colorName: '', imageUrl: '', isUploading: false, progress: '' });
        alert('🎨 새 색상 옵션이 추가되었습니다.');
      }
    } catch (err: any) {
      alert(`옵션 추가 중 오류: ${err.message}`);
    }
  };

  // Password Authentication handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      // 1. 서버사이드 RPC 함수로 비밀번호 검증 (admin_auth 테이블 직접 조회 차단됨)
      const { data: isValid, error: rpcError } = await supabase
        .rpc('verify_admin_password', { input_password: password });

      if (rpcError) throw rpcError;

      if (!isValid) {
        setAuthError('❌ 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 2. 일치하면 .env에 있는 계정 정보로 Supabase Auth 로그인 수행
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });

        if (authError) {
          console.error('Supabase Auth Error:', authError);
          setAuthError(`❌ 로그인 인증 실패: ${authError.message}`);
          return;
        }
      }

      // 3. 로그인 성공 시 세션 저장 및 인증 완료 처리
      setCookie('admin_auth', 'true', 7);
      setIsAuthenticated(true);
      setAuthError('');
    } catch (err: any) {
      console.error('Auth handler error:', err);
      setAuthError(`❌ 인증 처리 중 오류 발생: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Helper function to upload image to ImgBB with custom filename
  const uploadToImgBB = async (file: File, customName: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      throw new Error('ImgBB API Key가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }
    const formData = new FormData();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    // Re-create file object with custom filename
    const renamedFile = new File([file], `${customName}.${fileExtension}`, { type: file.type });
    formData.append('image', renamedFile);
    formData.append('name', customName);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`이미지 업로드 실패: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.error?.message || '이미지 업로드 실패');
    }
  };

  // --- Main Images Edit Modal Handlers ---
  const openMainImagesEditModal = (product: ProductFromDb) => {
    setEditingProductImages(product);
    setTempMainImages([...product.main_images]);
    setIsImagesModalOpen(true);
  };

  const closeMainImagesEditModal = () => {
    setEditingProductImages(null);
    setTempMainImages([]);
    setIsImagesModalOpen(false);
  };

  const handleRemoveTempImage = (index: number) => {
    setTempMainImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveTempImage = (index: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= tempMainImages.length) return;

    const updated = [...tempMainImages];
    const temp = updated[index];
    updated[index] = updated[nextIdx];
    updated[nextIdx] = temp;
    setTempMainImages(updated);
  };

  const handleAddModalMainImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProductImages) return;

    setIsUploadingTempImage(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setTempUploadProgress(`업로드 중... (${i + 1}/${files.length})`);
      try {
        const idx = tempMainImages.length + uploadedUrls.length + 1;
        const paddedIdx = String(idx).padStart(3, '0');
        const customName = `prod_${editingProductImages.id}_main_edit_${paddedIdx}`;

        const url = await uploadToImgBB(files[i], customName);
        uploadedUrls.push(url);
      } catch (err: any) {
        alert(`${files[i].name} 업로드 중 오류: ${err.message || err}`);
      }
    }

    setTempMainImages((prev) => [...prev, ...uploadedUrls]);
    setIsUploadingTempImage(false);
    setTempUploadProgress('');
    e.target.value = ''; // Reset input
  };

  const handleSaveMainImages = async () => {
    if (!editingProductImages) return;

    try {
      setIsLoadingDb(true);
      const { error } = await supabase
        .from('products')
        .update({ main_images: tempMainImages })
        .eq('id', editingProductImages.id);

      if (error) throw error;

      alert('대표 이미지가 성공적으로 수정되었습니다.');
      setDbProducts((prev) =>
        prev.map((p) =>
          p.id === editingProductImages.id ? { ...p, main_images: tempMainImages } : p
        )
      );
      closeMainImagesEditModal();
    } catch (err: any) {
      console.error('Error saving main images:', err);
      alert(`대표 이미지 저장 중 오류 발생: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Handle Main Images File Selection
  const handleMainImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsMainUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setMainUploadProgress(`업로드 중... (${i + 1}/${files.length})`);
      try {
        // Construct custom name: prod_{id}_main_{paddedIndex} (e.g. prod_14022_main_001)
        const idx = mainImageUrls.length + uploadedUrls.length + 1;
        const paddedIdx = String(idx).padStart(3, '0');
        const customName = `prod_${productId}_main_${paddedIdx}`;

        const url = await uploadToImgBB(files[i], customName);
        uploadedUrls.push(url);
      } catch (err: any) {
        alert(`${files[i].name} 업로드 중 오류: ${err.message || err}`);
      }
    }

    setMainImageUrls((prev) => [...prev, ...uploadedUrls]);
    setIsMainUploading(false);
    setMainUploadProgress('');
    e.target.value = ''; // Reset input file target
  };

  // Remove uploaded main image url
  const handleRemoveMainImage = (indexToRemove: number) => {
    setMainImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Variant Images File Selection (Upload multiple at once)
  const handleVariantImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsVarUploading(true);
    const newVariants: VariantInput[] = [];

    for (let i = 0; i < files.length; i++) {
      setVarUploadProgress(`업로드 중... (${i + 1}/${files.length})`);
      try {
        // Construct custom name: prod_{id}_option_{paddedIndex} (e.g. prod_14022_option_001)
        const nextIdx = variants.length + newVariants.length + 1;
        const paddedIdx = String(nextIdx).padStart(3, '0');
        const customName = `prod_${productId}_option_${paddedIdx}`;

        const url = await uploadToImgBB(files[i], customName);
        newVariants.push({
          colorName: `옵션 ${paddedIdx}`,
          imageUrl: url,
          isUploading: false
        });
      } catch (err: any) {
        alert(`${files[i].name} 업로드 중 오류: ${err.message || err}`);
      }
    }

    setVariants((prev) => [...prev, ...newVariants]);
    setIsVarUploading(false);
    setVarUploadProgress('');
    e.target.value = ''; // Reset file input target
  };

  // Remove variant row
  const handleRemoveVariantRow = (indexToRemove: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Update variant field
  const handleUpdateVariant = (index: number, fields: Partial<VariantInput>) => {
    setVariants((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...fields } : item))
    );
  };

  // Form Submit Handler (Supabase Registration)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return alert('상품명을 입력해주세요.');
    if (!price || isNaN(Number(price))) return alert('올바른 가격을 입력해주세요.');
    if (mainImageUrls.length === 0) return alert('대표 이미지를 최소 1개 이상 업로드해주세요.');
    if (variants.length === 0) return alert('색상 옵션 이미지를 최소 1개 이상 일괄 업로드해 등록해주세요.');

    // Validate Variants
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].colorName.trim()) {
        return alert(`${i + 1}번째 옵션의 색상명을 입력해주세요.`);
      }
      if (!variants[i].imageUrl) {
        return alert(`"${variants[i].colorName}" 옵션의 이미지가 누락되었습니다.`);
      }
    }

    setIsSubmitting(true);
    const finalCategory = category === '직접입력' ? customCategory.trim() : category;

    try {
      // 1. Insert into products table using the custom 5-digit productId
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          id: productId,
          name: name.trim(),
          price: Number(price),
          description: description.trim(),
          category: finalCategory,
          main_images: mainImageUrls,
          is_visible: true,
          is_deleted: false,
        })
        .select();

      if (productError) {
        throw productError;
      }

      if (!productData || productData.length === 0) {
        throw new Error('상품 데이터가 저장되었으나 반환되지 않았습니다.');
      }

      const newProductId = productData[0].id;

      // 2. Prepare and Insert product variants
      const variantsToInsert = variants.map((v, idx) => ({
        id: `${newProductId}-opt${idx + 1}`,
        product_id: newProductId,
        color_name: v.colorName.trim(),
        image: v.imageUrl,
        is_visible: true,
      }));

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert);

      if (variantsError) {
        // Cleanup product if variants insertion fails
        await supabase.from('products').delete().eq('id', newProductId);
        throw variantsError;
      }

      alert('🎉 성공적으로 상품이 등록되었습니다!');

      // Reset Form State
      setName('');
      setPrice('');
      setCategory('스카프');
      setCustomCategory('');
      setDescription('');
      setMainImageUrls([]);
      setVariants([]);
      // Generate a new 5-digit random Product ID for next item
      setProductId(Math.floor(10000 + Math.random() * 90000));

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('schema cache')) {
        alert(
          `❌ Supabase 테이블 설정 오류!\n\nDB에 'products' 테이블이 생성되지 않았습니다.\n프로젝트 루트에 있는 'schema.sql' 파일의 내용을 복사하여 Supabase SQL Editor에서 실행해주세요.`
        );
      } else {
        alert(`상품 등록 중 오류 발생: ${err.message || JSON.stringify(err)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isVerifyingSession) {
    return (
      <div className="loading-container" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontWeight: '700' }}>인증 세션을 확인하고 있습니다...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-auth-container">
        <div className="auth-card glassmorphism">
          <div className="auth-logo">MINDLE</div>
          <h2>관리자 화면 접속</h2>
          <p className="auth-subtitle">민들레 관리자 로그인</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="admin-password">비밀번호 입력</label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                required
              />
            </div>
            {authError && <p className="auth-error-msg">{authError}</p>}
            <button type="submit" className="auth-submit-btn">
              접속하기
            </button>
          </form>
          <div className="auth-footer-link">
            <Link to="/">← 메인 화면으로 돌아가기</Link>
          </div>
        </div>
      </div>
    );
  }

  // RENDER ADMIN DASHBOARD SCREEN
  return (
    <div className="admin-dashboard-container">
      {/* Admin Header */}
      <header className="admin-header glassmorphism">
        <div className="admin-header-left">
          <span className="admin-title-badge">ADMIN</span>
          <h1>상품 등록/관리</h1>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          상품 관리
        </button>
        <button
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          상품 등록
        </button>
        <button
          className={`tab-btn ${activeTab === 'trash' ? 'active' : ''}`}
          onClick={() => setActiveTab('trash')}
        >
          삭제된 상품
        </button>
      </nav>

      {/* Tab Contents */}
      <main className="admin-main-content">
        {activeTab === 'manage' || activeTab === 'trash' ? (
          <div className="product-manage-container">
            {isLoadingDb ? (
              <div className="loading-container" style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p>상품 목록을 불러오는 중입니다...</p>
              </div>
            ) : dbProducts.length === 0 ? (
              <div className="empty-products-msg glassmorphism" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>등록된 상품이 없습니다.</p>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>[신규 상품 등록] 탭에서 첫 상품을 추가해보세요!</p>
              </div>
            ) : (
              <>
                {/* Category and Search Filters */}
                <div className="orders-filter-bar glassmorphism" style={{
                  padding: '16px',
                  borderRadius: '14px',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {/* Row 1: 카테고리 필터 (가운데 정렬) */}
                  <div className="filter-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
                    {['전체', ...Array.from(new Set(dbProducts.filter(p => activeTab === 'trash' ? p.is_deleted === true : !p.is_deleted).map(p => p.category).filter(Boolean)))].map((cat) => (
                      <button
                        key={cat}
                        className={`filter-tag-btn ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Row 2: 상품 ID 및 상품명 검색 입력창 (가운데 정렬) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    maxWidth: '500px',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🔍 검색:</span>
                    <input
                      type="text"
                      placeholder="상품명 또는 상품 ID 검색"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-h)',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        width: '100%'
                      }}
                    />
                  </div>
                </div>

                {(() => {
                  const filtered = dbProducts.filter((product) => {
                    // 0. Soft Delete Filter
                    if (activeTab === 'trash') {
                      if (product.is_deleted !== true) return false;
                    } else {
                      if (product.is_deleted === true) return false;
                    }
                    // 1. Category Filter
                    if (selectedCategory !== '전체' && product.category !== selectedCategory) {
                      return false;
                    }
                    // 2. Search Query (ID or Name)
                    const query = productSearchQuery.trim().toLowerCase();
                    if (query) {
                      const nameMatch = product.name.toLowerCase().includes(query);
                      const idMatch = String(product.id).includes(query);
                      return nameMatch || idMatch;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-products-msg glassmorphism" style={{ padding: '60px 20px', textAlign: 'center', width: '100%' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>검색 및 필터 결과와 일치하는 상품이 없습니다.</p>
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>검색어나 필터 카테고리를 변경해 보세요.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="manage-products-grid">
                      {filtered.map((product) => {
                        const productVariants = dbVariants.filter(v => v.product_id === product.id);
                        const inlineInput = getInlineInput(product.id);

                        return (
                          <div key={product.id} className={`manage-product-card glassmorphism ${product.is_deleted ? 'blind-product-card' : ''}`}>
                            <div className="manage-product-header">
                              <div className="manage-product-info">
                                <span className="manage-product-category">{product.category}</span>
                                <span className="manage-product-id">ID: {product.id}</span>
                                <h3 className="manage-product-title">
                                  {product.is_deleted && <span style={{ color: '#ef4444', marginRight: '6px', fontWeight: '800' }}>[삭제됨]</span>}
                                  {product.name}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  {editingPriceProductId === product.id ? (
                                    <>
                                      <input
                                        type="number"
                                        value={newPriceValue}
                                        onChange={(e) => setNewPriceValue(e.target.value)}
                                        style={{
                                          width: '100px',
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          border: '1.5px solid var(--accent)',
                                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                          color: 'var(--text-h)',
                                          fontWeight: '700',
                                          fontSize: '0.95rem',
                                          outline: 'none'
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSavePrice(product.id)}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          backgroundColor: 'var(--accent)',
                                          color: 'white',
                                          fontWeight: '700',
                                          fontSize: '0.85rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        저장
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingPriceProductId(null);
                                          setNewPriceValue('');
                                        }}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--border)',
                                          backgroundColor: 'transparent',
                                          color: 'var(--text-muted)',
                                          fontWeight: '700',
                                          fontSize: '0.85rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        취소
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <p className="manage-product-price" style={{ margin: 0 }}>{Number(product.price).toLocaleString()}원</p>
                                      {!product.is_deleted && (
                                        <button
                                          onClick={() => {
                                            setEditingPriceProductId(product.id);
                                            setNewPriceValue(String(product.price));
                                          }}
                                          style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-muted)',
                                            fontWeight: '800',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                          }}
                                          className="price-edit-btn"
                                        >
                                          수정
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="manage-product-thumbnail-wrapper" style={{ position: 'relative' }}>
                                <img
                                  src={product.main_images[0] || 'https://via.placeholder.com/150'}
                                  alt={product.name}
                                  className="manage-product-thumbnail"
                                />
                                {!product.is_deleted && (
                                  <button
                                    type="button"
                                    onClick={() => openMainImagesEditModal(product)}
                                    className="thumbnail-edit-btn"
                                    style={{
                                      position: 'absolute',
                                      bottom: '4px',
                                      right: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      border: '1.5px solid var(--border)',
                                      backgroundColor: 'var(--bg)',
                                      color: 'var(--text-h)',
                                      fontWeight: '800',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                      transition: 'all 0.2s ease-in-out'
                                    }}
                                  >
                                    수정
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="manage-product-controls">
                              {product.is_deleted ? (
                                <>
                                  <div className="visibility-toggle-group">
                                    <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#ef4444' }}>
                                      블라인드 상태
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="restore-product-action-btn"
                                    onClick={() => handleRestoreProduct(product.id, product.name)}
                                    style={{
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      border: '2px solid var(--accent)',
                                      backgroundColor: 'var(--accent)',
                                      color: 'white',
                                      fontWeight: '800',
                                      fontSize: '0.85rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    복원하기
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* 상품 노출 제어 토글 */}
                                  <div className="visibility-toggle-group">
                                    <label className="toggle-switch">
                                      <input
                                        type="checkbox"
                                        checked={product.is_visible}
                                        onChange={() => handleToggleProductVisibility(product.id, product.is_visible)}
                                      />
                                      <span className="toggle-slider"></span>
                                    </label>
                                    <span className={`visibility-label ${product.is_visible ? 'visible' : 'hidden'}`}>
                                      {product.is_visible ? '쇼핑몰 노출 중' : '노출 중단됨'}
                                    </span>
                                  </div>

                                  {/* 상품 삭제 */}
                                  <button
                                    className="delete-product-action-btn"
                                    onClick={() => handleDeleteProduct(product.id, product.name)}
                                  >
                                    상품 삭제
                                  </button>
                                </>
                              )}
                            </div>

                            {/* 색상 옵션 관리 영역 */}
                            <div className="manage-variants-section">
                              <h4>색상 옵션 관리 ({productVariants.length})</h4>

                              {productVariants.length === 0 ? (
                                <p className="no-variants-text">등록된 색상 옵션이 없습니다.</p>
                              ) : (
                                <div className="manage-variants-list">
                                  {productVariants.map((variant) => (
                                    <div key={variant.id} className="manage-variant-row">
                                      <img src={variant.image} alt={variant.color_name} className="manage-variant-thumb" />
                                      <span className="manage-variant-name">{variant.color_name}</span>

                                      <div className="manage-variant-row-controls">
                                        {!product.is_deleted ? (
                                          <>
                                            {/* 색상 노출 토글 */}
                                            <button
                                              className={`variant-visibility-btn ${variant.is_visible ? 'visible' : 'hidden'}`}
                                              onClick={() => handleToggleVariantVisibility(variant.id, variant.is_visible)}
                                              title={variant.is_visible ? '노출 중 (클릭 시 중단)' : '노출 중단됨 (클릭 시 노출)'}
                                            >
                                              {variant.is_visible ? '노출' : '숨김'}
                                            </button>
                                            {/* 색상 삭제 */}
                                            <button
                                              className="variant-delete-btn"
                                              onClick={() => handleDeleteVariant(variant.id, variant.color_name)}
                                              title="옵션 삭제"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {variant.is_visible ? '노출 상태' : '숨김 상태'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 신규 색상 옵션 추가 (인라인 폼) */}
                              {!product.is_deleted && (
                                <div className="inline-add-variant-box">
                                  <h5>새 색상 추가</h5>
                                  <div className="inline-variant-form-row">
                                    <div className="inline-file-input-wrapper">
                                      <input
                                        type="file"
                                        id={`inline-file-input-${product.id}`}
                                        accept="image/*"
                                        onChange={(e) => handleInlineVariantImageChange(product.id, e)}
                                        disabled={inlineInput.isUploading}
                                        style={{ display: 'none' }}
                                      />
                                      <label
                                        htmlFor={`inline-file-input-${product.id}`}
                                        className="inline-file-label"
                                      >
                                        {inlineInput.isUploading ? (
                                          <span className="spinner-small" style={{ display: 'block', width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                        ) : inlineInput.imageUrl ? (
                                          <img src={inlineInput.imageUrl} alt="preview" className="inline-upload-preview" />
                                        ) : (
                                          '사진'
                                        )}
                                      </label>
                                    </div>

                                    <input
                                      type="text"
                                      value={inlineInput.colorName}
                                      onChange={(e) => updateInlineInput(product.id, { colorName: e.target.value })}
                                      placeholder="색상명 입력"
                                      className="inline-variant-name-input"
                                    />

                                    <button
                                      type="button"
                                      className="inline-variant-add-submit-btn"
                                      onClick={() => handleAddInlineVariant(product.id)}
                                      disabled={inlineInput.isUploading || !inlineInput.imageUrl || !inlineInput.colorName.trim()}
                                    >
                                      추가
                                    </button>
                                  </div>
                                  {inlineInput.isUploading && <p className="inline-upload-progress-text">{inlineInput.progress}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleProductSubmit} className="product-register-form">
            <div className="form-sections-grid">

              {/* 왼쪽 섹션: 기본 정보 */}
              <div className="form-card basic-info-card glassmorphism">
                <h3>📋 상품 기본 정보</h3>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>상품명 *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예) 플라워 프릴 보닛"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>도매 가격 (원) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="예) 18000"
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>카테고리 *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="스카프">스카프</option>
                      <option value="모자">모자</option>
                      <option value="두건">두건</option>
                      <option value="잡화">잡화</option>
                      <option value="직접입력">직접 입력...</option>
                    </select>
                  </div>

                  {category === '직접입력' && (
                    <div className="form-group">
                      <label>직접 입력 카테고리 *</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="예) 신발"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>상품 설명</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="소재, 특징, 권장 연령 등 거래처 사장님들께 노출될 정보를 작성해주세요."
                    rows={4}
                  />
                </div>
              </div>

              {/* 오른쪽 섹션: 이미지 일괄 업로드 */}
              <div className="form-card images-upload-card glassmorphism">
                <h3>🖼️ 대표 이미지 등록 *</h3>
                <p className="card-subtitle">
                  상품 상세 정보 상단 슬라이드쇼에 노출되는 대표 이미지들입니다. (여러 장 선택 가능)
                </p>

                <div className="file-uploader-box">
                  <input
                    type="file"
                    id="main-images-input"
                    multiple
                    accept="image/*"
                    onChange={handleMainImagesChange}
                    disabled={isMainUploading}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="main-images-input" className="file-uploader-label">
                    {isMainUploading ? (
                      <div className="upload-loader">
                        <span className="spinner"></span>
                        <p>{mainUploadProgress}</p>
                      </div>
                    ) : (
                      <>
                        <span className="upload-icon">📤</span>
                        <p>사진 파일 선택 (여러 개 선택 가능)</p>
                        <span className="upload-btn-styled">파일 찾기</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Uploaded Main Images list */}
                {mainImageUrls.length > 0 && (
                  <div className="uploaded-previews-grid">
                    {mainImageUrls.map((url, idx) => (
                      <div key={idx} className="preview-thumbnail-container">
                        <span className="img-idx-badge">{idx + 1}</span>
                        <img src={url} alt={`대표 이미지 ${idx + 1}`} className="preview-img-square" />
                        <button
                          type="button"
                          className="delete-preview-btn"
                          onClick={() => handleRemoveMainImage(idx)}
                          title="삭제"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* 하단 섹션: 색상 옵션(Variants) */}
            <div className="form-card variants-card glassmorphism">
              <div className="variants-card-header">
                <div>
                  <h3>🎨 색상별 옵션 등록 *</h3>
                  <p className="card-subtitle">먼저 옵션 이미지들을 한 번에 선택하여 업로드하면, 아래에 옵션명 입력란이 생성됩니다.</p>
                </div>
                <div className="variants-uploader-wrapper">
                  <input
                    type="file"
                    id="variant-images-input"
                    multiple
                    accept="image/*"
                    onChange={handleVariantImagesChange}
                    disabled={isVarUploading}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="variant-images-input"
                    className="add-variant-row-btn"
                    style={{ cursor: isVarUploading ? 'not-allowed' : 'pointer', display: 'inline-block' }}
                  >
                    {isVarUploading ? (
                      <span className="row-uploading-loader" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small"></span>
                        {varUploadProgress}
                      </span>
                    ) : (
                      '📤 색상 사진 등록 (여러 개 선택)'
                    )}
                  </label>
                </div>
              </div>

              {variants.length === 0 ? (
                <div className="empty-variants-msg" style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: 'var(--code-bg)', borderRadius: '12px', border: '1.5px dashed var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)' }}>등록된 옵션이 없습니다.</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: 'var(--text)' }}>위의 [옵션 이미지 일괄 업로드] 버튼을 눌러 사진을 등록해 주세요.</p>
                </div>
              ) : (
                <div className="variants-input-list">
                  {variants.map((v, idx) => (
                    <div key={idx} className="variant-form-row" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div className="variant-row-num">{idx + 1}</div>

                      {/* 이미지 미리보기 */}
                      <div className="variant-preview-box" style={{ flexShrink: 0 }}>
                        <img
                          src={v.imageUrl}
                          alt={`옵션 ${idx + 1}`}
                          className="variant-row-thumb-large"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                        />
                      </div>

                      {/* 옵션명 */}
                      <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.95rem', marginBottom: '6px' }}>색상/옵션명</label>
                        <input
                          type="text"
                          value={v.colorName}
                          onChange={(e) => handleUpdateVariant(idx, { colorName: e.target.value })}
                          placeholder="예) 옵션 01 또는 검정"
                          required
                          style={{ padding: '12px' }}
                        />
                      </div>

                      {/* 삭제 단추 */}
                      <button
                        type="button"
                        className="remove-row-btn"
                        onClick={() => handleRemoveVariantRow(idx)}
                        title="이 옵션 행 삭제"
                        style={{ marginBottom: 0, padding: '12px 16px' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 최종 제출 */}
            <div className="form-actions-bar">
              <button
                type="submit"
                className="submit-product-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? '상품 데이터를 저장 중...' : '상품 등록 완료'}
              </button>
            </div>

          </form>
        )}
      </main>

      {/* 대표 이미지 수정 팝업 모달 */}
      {isImagesModalOpen && editingProductImages && (
        <div className="customer-modal-overlay" onClick={closeMainImagesEditModal}>
          <div className="customer-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="customer-modal-header">
              <div>
                <span className="customer-modal-subtitle">EDIT MAIN IMAGES</span>
                <h2 className="customer-modal-title">{editingProductImages.name} 대표 이미지 관리</h2>
              </div>
              <button className="customer-modal-close-btn" onClick={closeMainImagesEditModal} aria-label="Close modal">
                &times;
              </button>
            </div>

            <div className="customer-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 이미지 파일 추가 업로더 */}
              <div className="modal-upload-box" style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'var(--code-bg)' }}>
                <input
                  type="file"
                  id="modal-main-images-input"
                  multiple
                  accept="image/*"
                  onChange={handleAddModalMainImages}
                  disabled={isUploadingTempImage}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="modal-main-images-input"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: isUploadingTempImage ? 'not-allowed' : 'pointer' }}
                >
                  {isUploadingTempImage ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span className="spinner-small" style={{ display: 'block', width: '20px', height: '20px', border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>{tempUploadProgress}</p>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>+</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-h)' }}>사진 파일 추가 선택</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>여러 개의 대표 이미지를 선택하여 추가할 수 있습니다.</span>
                    </>
                  )}
                </label>
              </div>

              {/* 업로드된 대표 이미지 카드 리스트 */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-h)', marginBottom: '12px' }}>
                  등록된 대표 이미지 (총 {tempMainImages.length}장)
                </h3>

                {tempMainImages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.9rem' }}>
                    등록된 대표 이미지가 없습니다. 상단의 파일 찾기를 통해 추가해 주세요.
                  </p>
                ) : (
                  <div className="modal-thumbnails-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {tempMainImages.map((url, idx) => (
                      <div key={idx} className="modal-thumbnail-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'var(--accent)', color: 'white', fontSize: '0.75rem', fontWeight: '800', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                          {idx + 1}
                        </span>
                        
                        <img src={url} alt={`대표 이미지 ${idx + 1}`} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                        
                        {/* 순서 조정 & 삭제 액션 */}
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between', marginTop: '4px' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveTempImage(idx, 'up')}
                            style={{ flex: 1, padding: '2px 0', fontSize: '0.7rem', fontWeight: '800', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: idx === 0 ? 'transparent' : 'var(--bg)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            이전
                          </button>
                          <button
                            type="button"
                            disabled={idx === tempMainImages.length - 1}
                            onClick={() => handleMoveTempImage(idx, 'down')}
                            style={{ flex: 1, padding: '2px 0', fontSize: '0.7rem', fontWeight: '800', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: idx === tempMainImages.length - 1 ? 'transparent' : 'var(--bg)', cursor: idx === tempMainImages.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === tempMainImages.length - 1 ? 0.3 : 1 }}
                          >
                            다음
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveTempImage(idx)}
                          style={{ padding: '4px 0', fontSize: '0.75rem', fontWeight: '800', color: '#ef4444', borderRadius: '4px', border: '1.5px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'transparent', cursor: 'pointer' }}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 제어 버튼 */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1.5px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={closeMainImagesEditModal}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-h)', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveMainImages}
                  disabled={isUploadingTempImage || isLoadingDb}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--accent)', backgroundColor: 'var(--accent)', color: 'white', fontWeight: '800', fontSize: '0.88rem', cursor: (isUploadingTempImage || isLoadingDb) ? 'not-allowed' : 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                >
                  {isLoadingDb ? '저장 중...' : '저장하기'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}


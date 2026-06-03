import type { Product } from '../types/product';

const getAssetUrl = (name: string) => {
  return `/Products/${name}`;
};

export const mockProducts: Product[] = [
  {
    id: 1,
    name: "꽃레이스두건",
    price: 18000,
    description: "우아하고 섬세한 플라워 레이스 패턴으로 여성스러운 매력을 더해주는 두건입니다. 가볍고 통기성이 좋아 편안하게 착용하기 좋습니다.",
    category: "두건",
    mainImages: [
      getAssetUrl("꽃레이스두건_main_01.jpg"),
      getAssetUrl("꽃레이스두건_main_02.jpg"),
      getAssetUrl("꽃레이스두건_main_03.jpg"),
      getAssetUrl("꽃레이스두건_main_04.jpg"),
      getAssetUrl("꽃레이스두건_main_05.jpg")
    ],
    variants: [
      { id: "1-opt1", colorName: "옵션 01", image: getAssetUrl("꽃레이스두건_00001.jpg") },
      { id: "1-opt2", colorName: "옵션 02", image: getAssetUrl("꽃레이스두건_00002.jpg") },
      { id: "1-opt3", colorName: "옵션 03", image: getAssetUrl("꽃레이스두건_00003.jpg") },
      { id: "1-opt4", colorName: "옵션 04", image: getAssetUrl("꽃레이스두건_00004.jpg") },
      { id: "1-opt5", colorName: "옵션 05", image: getAssetUrl("꽃레이스두건_00005.jpg") }
    ]
  },
  {
    id: 2,
    name: "레인보우벙거지",
    price: 28000,
    description: "유니크한 레인보우 배색 포인트가 돋보이는 벙거지 모자입니다. 데일리 룩에 가볍게 걸쳐 포인트 아이템으로 코디하기 안성맞춤입니다.",
    category: "모자",
    mainImages: [
      getAssetUrl("레인보우벙거지_main_01.jpg"),
      getAssetUrl("레인보우벙거지_main_02.jpg"),
      getAssetUrl("레인보우벙거지_main_03.jpg")
    ],
    variants: [
      { id: "2-opt1", colorName: "옵션 01", image: getAssetUrl("레인보우벙거지_00001.jpg") },
      { id: "2-opt2", colorName: "옵션 02", image: getAssetUrl("레인보우벙거지_00002.jpg") },
      { id: "2-opt3", colorName: "옵션 03", image: getAssetUrl("레인보우벙거지_00003.jpg") }
    ]
  },
  {
    id: 3,
    name: "텐셀삼각",
    price: 16000,
    description: "부드럽고 찰랑이는 텐셀 소재로 제작되어 피부 자극 없이 부드럽게 감싸주는 삼각 두건입니다. 다양한 연출이 가능하여 실용적입니다.",
    category: "두건",
    mainImages: [
      getAssetUrl("텐셀삼각_main_01.jpg"),
      getAssetUrl("텐셀삼각_main_02.jpg"),
      getAssetUrl("텐셀삼각_main_03.jpg"),
      getAssetUrl("텐셀삼각_main_04.jpg")
    ],
    variants: [
      { id: "3-opt1", colorName: "옵션 01", image: getAssetUrl("텐셀삼각_00001.jpg") },
      { id: "3-opt3", colorName: "옵션 02", image: getAssetUrl("텐셀삼각_00003.jpg") },
      { id: "3-opt4", colorName: "옵션 03", image: getAssetUrl("텐셀삼각_00004.jpg") },
      { id: "3-opt5", colorName: "옵션 04", image: getAssetUrl("텐셀삼각_00005.jpg") },
      { id: "3-opt6", colorName: "옵션 05", image: getAssetUrl("텐셀삼각_00006.jpg") },
      { id: "3-opt7", colorName: "옵션 06", image: getAssetUrl("텐셀삼각_00007.jpg") },
      { id: "3-opt8", colorName: "옵션 07", image: getAssetUrl("텐셀삼각_00008.jpg") }
    ]
  },
  {
    id: 4,
    name: "프릴레이스카라",
    price: 15000,
    description: "러블리한 프릴 레이스 디테일이 돋보이는 탈부착 카라입니다. 밋밋한 탑이나 원피스 위에 가볍게 매치하여 로맨틱한 무드를 더해보세요.",
    category: "잡화",
    mainImages: [
      getAssetUrl("프릴레이스카라_main_01.jpg"),
      getAssetUrl("프릴레이스카라_main_02.jpg"),
      getAssetUrl("프릴레이스카라_main_03.jpg")
    ],
    variants: [
      { id: "4-opt1", colorName: "옵션 01", image: getAssetUrl("프릴레이스카라_00001.jpg") },
      { id: "4-opt2", colorName: "옵션 02", image: getAssetUrl("프릴레이스카라_00002.jpg") }
    ]
  }
];

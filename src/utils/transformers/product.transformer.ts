import { IProduct } from '../../models/product.model';

const formatDate = (date: Date, withTime = false) => {
  if (!date) {return null;}
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!withTime) {return `${day}-${month}-${year}`;}

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const productTransformer = {
  // Calcula o desconto em porcentagem, retorna undefined se não houver desconto real
  calculateDiscount: (product: IProduct) => {
    if (
      product.isPromotionActive &&
      product.promotionalPrice !== undefined &&
      product.promotionalPrice < product.price
    ) {
      return Math.round(100 - (product.promotionalPrice / product.price) * 100);
    }
    return undefined;
  },

  // PLP - Product List Page (para exibição em listagem)
  transformProductForPublicList: (product: IProduct) => {
    const discountPercentage = productTransformer.calculateDiscount(product);

    return {
      id: product._id,
      name: product.name,
      price: product.price,
      promotionalPrice: product.promotionalPrice || null,
      isPromotionActive: product.isPromotionActive,
      ...(discountPercentage ? { discountPercentage } : {}),
      mainImage: product.mainImageUrl || null,
      rating: product.rating,
      stockQuantity: product.stockQuantity,
    };
  },

  // PDP - Product Detail Page (para exibição de detalhe)
  transformProductForPublicDetail: (product: IProduct) => {
    const discountPercentage = productTransformer.calculateDiscount(product);

    return {
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      promotionalPrice: product.promotionalPrice || null,
      isPromotionActive: product.isPromotionActive,
      ...(discountPercentage ? { discountPercentage } : {}),
      mainImage: product.mainImageUrl || null,
      images:
        product.images?.length > 0
          ? product.images.map((img) => img.url)
          : [product.mainImageUrl || null],
      rating: product.rating,
      stockQuantity: product.stockQuantity,
      createdAt: formatDate(product.createdAt),
      updatedAt: formatDate(product.updatedAt, true),
    };
  },

  // Admin transformer
  transformProductForAdmin: (product: IProduct) => {
    return {
      productId: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      promotionalPrice: product.promotionalPrice || null,
      isPromotionActive: product.isPromotionActive,
      images: product.images.length > 0 ? product.images : [product.mainImageUrl || null],
      mainImage: product.mainImageUrl || null,
      rating: product.rating,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      createdAt: formatDate(product.createdAt),
      updatedAt: formatDate(product.updatedAt, true),
    };
  },
};

export default productTransformer;

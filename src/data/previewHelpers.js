import { getProductPreviewType } from "./products";

export function getPreviewTypeForProduct(product, fallback = "image") {
  if (!product) return fallback;
  return getProductPreviewType(product) || fallback;
}

export function getPreviewTypeForCartItem(item) {
  if (!item) return "image";

  if (item.previewType) {
    return item.previewType;
  }

  if (item.productType === "dorropnare") {
    return "imageTall";
  }

  if (item.productType === "yrkestitelsskylt") {
    return "profession";
  }

  if (item.productType === "pendlad_skylt") {
    return "hanging_sign";
  }

  if (item.productType === "dorrskylt") {
    return "door_sign";
  }

  if (item.badgeId) {
    return "badge";
  }

  return "image";
}

export function getFormPreviewConfig(product) {
  const previewType = getPreviewTypeForProduct(product);

  if(previewType==="parking_pole")return {previewType,badgeId:product?.id,productType:"stolpe",maxWidth:500};
  if(previewType==="parking_sign")return {previewType,badgeId:product?.id,productType:"parkeringsskylt",maxWidth:600};
  if(previewType==="destination_cube")return {previewType,badgeId:product?.id,productType:"malpunktskub",maxWidth:520};
  if(previewType==="dibond_sign")return {previewType,badgeId:product?.id,productType:product?.productType||"dibondskylt",maxWidth:520};
  if (previewType === "ot_board") return {previewType,badgeId:product?.id,productType:"ot_tavla",maxWidth:400};
  if (previewType === "elevator_board") {
    return { previewType, badgeId: product?.id, productType: "hisstavla", maxWidth: 400 };
  }

  if (previewType === "profession") {
    return {
      previewType,
      badgeId: product?.id,
      productType: "yrkestitelsskylt",
      maxWidth: 700,
    };
  }

  if (previewType === "badge") {
    return {
      previewType,
      badgeId: product?.id,
      productType: "namnbricka",
      maxWidth: 600,
    };
  }

  if (previewType === "hanging_sign") {
    return {
      previewType,
      badgeId: product?.id,
      productType: "pendlad_skylt",
      maxWidth: 600,
    };
  }

  if (previewType === "door_sign") {
    return {
      previewType,
      badgeId: product?.id,
      productType: "dorrskylt",
      maxWidth: 520,
    };
  }

  if (previewType === "imageTall") {
    return {
      previewType,
      image: product?.image || "",
      alt: product?.name || "Produktbild",
      width: 220,
      height: 300,
      maxWidth: 600,
    };
  }

  return {
    previewType: "image",
    image: product?.image || "",
    alt: product?.name || "Produktbild",
    width: 240,
    height: 180,
    maxWidth: 600,
  };
}

export function getCartPreviewConfig(item) {
  const previewType = getPreviewTypeForCartItem(item);

  if(previewType==="parking_pole")return {previewType,badgeId:item?.badgeId,productType:"stolpe",maxWidth:180,mini:true};
  if(previewType==="parking_sign")return {previewType,badgeId:item?.badgeId,productType:"parkeringsskylt",maxWidth:180,mini:true};
  if(previewType==="destination_cube")return {previewType,badgeId:item?.badgeId,productType:"malpunktskub",maxWidth:180,mini:true};
  if(previewType==="dibond_sign")return {previewType,badgeId:item?.badgeId,productType:"dibondskylt",maxWidth:180,mini:true};
  if (previewType === "ot_board") return {previewType,badgeId:item?.badgeId,productType:"ot_tavla",maxWidth:180,mini:true};
  if (previewType === "elevator_board") {
    return { previewType, badgeId: item?.badgeId, productType: "hisstavla", maxWidth: 180, mini: true };
  }

  if (previewType === "profession") {
    return {
      previewType,
      badgeId: item?.badgeId,
      productType: item?.productType || "yrkestitelsskylt",
      maxWidth: 180,
      mini: true,
    };
  }

  if (previewType === "badge") {
    return {
      previewType,
      badgeId: item?.badgeId,
      productType: item?.productType || "namnbricka",
      maxWidth: 180,
      mini: true,
    };
  }

  if (previewType === "hanging_sign") {
    return {
      previewType,
      badgeId: item?.badgeId,
      productType: item?.productType || "pendlad_skylt",
      maxWidth: 180,
      mini: true,
    };
  }

  if (previewType === "door_sign") {
    return {
      previewType,
      badgeId: item?.badgeId,
      productType: item?.productType || "dorrskylt",
      maxWidth: 190,
      mini: true,
    };
  }

  if (previewType === "imageTall") {
    return {
      previewType,
      image: item?.image || "",
      alt: item?.badgeName || item?.name || "Produktbild",
      width: 110,
      height: 220,
    };
  }

  return {
    previewType: "image",
    image: item?.image || "",
    alt: item?.badgeName || item?.name || "Produktbild",
    width: 160,
    height: 120,
  };
}
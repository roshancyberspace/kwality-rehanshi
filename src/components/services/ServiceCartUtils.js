export const getCartItemKey = (item) => String(item?.id ?? item?.name ?? '')

export const addPackageToCart = (cart, item) => {
  const key = getCartItemKey(item)
  const exists = cart.find((cartItem) => getCartItemKey(cartItem) === key)

  if (exists) {
    return cart.map((cartItem) =>
      getCartItemKey(cartItem) === key ? {
        ...cartItem,
        quantity: cartItem.quantity + 1,
        serviceName: item.serviceName || cartItem.serviceName,
        groupName: item.groupName || cartItem.groupName,
        originalPrice: item.originalPrice || cartItem.originalPrice || cartItem.original_price,
      } : cartItem,
    )
  }

  return [...cart, {
    ...item,
    quantity: 1,
    originalPrice: item.originalPrice || item.original_price,
  }]
}

export const getPackageAmount = (price) => {
  if (typeof price === 'number') {
    return price
  }

  return Number(String(price).replace(/\D/g, '')) || 0
}

export const getCartTotal = (cart) =>
  cart.reduce((total, item) => total + getPackageAmount(item.price) * item.quantity, 0)

export const getDisplayCart = (cart) =>
  cart.map((item) => ({
    ...item,
    lineTotal: getPackageAmount(item.price) * item.quantity,
  }))

export const getCartItemQuantity = (cart, item) =>
  cart.find((cartItem) => getCartItemKey(cartItem) === getCartItemKey(item))?.quantity || 0

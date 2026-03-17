export function buildWhatsappUrl(phone?: string) {

  if (!phone) return null;

  const clean = phone.replace(/\D/g, "");

  return `https://wa.me/${clean}`;
}

export function buildInstagramUrl(user?: string) {

  if (!user) return null;

  const clean = user.replace("@", "");

  return `https://instagram.com/${clean}`;
}

export function buildWebsiteUrl(url?: string) {

  if (!url) return null;

  if (url.startsWith("http")) return url;

  return `https://${url}`;
}

export function formatWhatsappDisplay(phone?: string) {

  if (!phone) return "";

  return phone;
}

export function formatInstagramDisplay(user?: string) {

  if (!user) return "";

  return user.startsWith("@") ? user : `@${user}`;
}

export function formatWebsiteDisplay(url?: string) {

  if (!url) return "";

  return url.replace(/^https?:\/\//, "");
}
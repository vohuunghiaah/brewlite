export async function fetchProducts(apiUrl, signal) {
  const response = await fetch(`${apiUrl}/products`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

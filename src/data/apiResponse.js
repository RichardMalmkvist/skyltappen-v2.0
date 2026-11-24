/** Read an API response without exposing raw HTML or JSON parser errors to users. */
export async function readApiResponse(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new Error("Kunde inte ansluta till JSF Flow-servern. Kontrollera terminalen där npm run dev körs och starta om appen. Om port 8080 används av ett annat program måste det stängas först.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Serverfel (${response.status}).`);
  return data;
}

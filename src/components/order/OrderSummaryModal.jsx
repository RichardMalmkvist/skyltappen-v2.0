import BadgePreview from "../products/BadgePreview";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import {
  isProfessionProductType,
} from "../../data/productHelpers";

export default function OrderSummaryModal({
  showOrderSummary,
  setShowOrderSummary,
  cart,
  orderer,
  delivery,
  submitOrderToBackend,
  modalOverlayStyle,
  modalContentStyle,
  sectionTitleStyle,
  secondaryButtonStyle,
  primaryButtonStyle,
}) {
  if (!showOrderSummary) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>
          Sammanfattning av beställning
        </h2>

        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitleStyle}>Produkter</div>
          <div style={{ display: "grid", gap: 12 }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fafafa",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 190px",
                  gap: 18,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                    {item.badgeName}
                  </div>

                  {getCartItemDisplayRows(item).map((row, index) => (
                    <div key={`${row.label}-${index}`}>
                      <strong>{row.label}:</strong> {row.value}
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                    Förhandsvisning
                  </div>

                  <BadgePreview
                    badgeId={item.badgeId}
                    productType={item.productType}
                    productForm={
                      isProfessionProductType(item.productType)
                        ? {
                            title: item.title,
                            professionChoiceId: item.professionChoiceId,
                          }
                        : {
                            name: item.name || "",
                            title: item.title || "",
                            titleLine2: item.titleLine2 || "",
                            orgLine1: item.orgLine1 || "",
                            orgLine2: item.orgLine2 || "",
                          }
                    }
                    maxWidth={190}
                    mini
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitleStyle}>Beställare</div>
          <div>
            <span style={{ color: "#666" }}>Namn:</span> {orderer.ordererName || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>E-post:</span> {orderer.ordererEmail || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Mobilnummer:</span> {orderer.ordererPhone || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Ansvarsnummer:</span> {orderer.accountNumber || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Beskrivning:</span>{" "}
            {orderer.messageToSupplier || "-"}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitleStyle}>Leveransadress</div>
          <div>
            <span style={{ color: "#666" }}>Företag:</span> {delivery.company || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Mottagare:</span> {delivery.recipient || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Adress:</span> {delivery.address || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Postnummer:</span> {delivery.postalCode || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Postort:</span> {delivery.city || "-"}
          </div>
          <div>
            <span style={{ color: "#666" }}>Land:</span> {delivery.country || "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowOrderSummary(false)}
            className="jsf-back-link"
            style={secondaryButtonStyle}
          >
            ← Tillbaka och ändra
          </button>

          <button
            type="button"
            onClick={submitOrderToBackend}
            style={primaryButtonStyle}
          >
            Bekräfta beställning
          </button>
        </div>
      </div>
    </div>
  );
}
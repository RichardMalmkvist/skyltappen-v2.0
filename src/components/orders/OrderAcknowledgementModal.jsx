import {isBadgeOrder,badgeAddressLines} from "../../data/badgeProduction";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import { getOrderDetails } from "../../data/orderDetailsHelpers";
import { getOrderCustomer } from "../../data/orderCustomer";

function money(value) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value) {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) return "-";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(source);
}

function valueOrDash(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function itemDescriptionRows(item, isQuote) {
  return getCartItemDisplayRows(item, {compactElevator:isQuote}).filter(
    (row) => row.label !== "Antal" && row.label !== "Art.nr" && row.label !== "Typ"
  );
}

function itemTitle(item) {
  return (
    item.badgeName ||
    item.productName ||
    item.desc ||
    item.name ||
    item.productTypeLabel ||
    "Artikel"
  );
}

export default function OrderAcknowledgementModal({ order, onClose, variant = "acknowledgement" }) {
  const badgeOrder=isBadgeOrder(order);
  const shippingLines=badgeAddressLines(order);
  const isQuote = variant === "quote";
  const isWorkOrder = variant === "workOrder";
  const isDeliveryNote = variant === "deliveryNote";
  // Badge acknowledgements use the delivery note layout, with their own heading.
  const isInternalDocument = isWorkOrder || isDeliveryNote || (badgeOrder && variant === "acknowledgement");
  const documentName = isQuote ? "Offert" : isDeliveryNote ? "Följesedel" : isWorkOrder ? "Arbetsorder" : "Ordererkännande";
  const barcodeRef = useRef(null);
  useEffect(() => {
    if (!order) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [order, onClose]);

  const orderNumber = order?.orderNumber || order?.submissionNumber || "Order";

  useEffect(() => {
    if (!order || !barcodeRef.current || !orderNumber) return;
    try {
      JsBarcode(barcodeRef.current, String(orderNumber), {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 38,
        width: 1.55,
        lineColor: "#171a18",
        background: "#ffffff",
      });
    } catch (error) {
      console.warn("Kunde inte skapa streckkod för ordererkännandet", error);
    }
  }, [order, orderNumber]);

  if (!order) return null;

  const totalQuantity = (order.cart || []).reduce(
    (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
    0
  );

  const confirmedDelivery = order?.productionPlan?.deliveryDate;
  const confirmedInstallation = order?.productionPlan?.installationDate;

  const printDocument = () => {
    const previousTitle = document.title;
    document.title = `${isQuote ? "Offert" : isDeliveryNote ? "Foljesedel" : isWorkOrder ? "Arbetsorder" : "Ordererkannande"}_${String(orderNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1500);
  };

  // Mount outside the page: project-panel h2/p rules otherwise override the
  // document typography when a frozen quote opens from proof approval.
  return createPortal(
    <div className="jsf-minimal jsf-document-layer"><div className="order-ack-overlay" role="dialog" aria-modal="true" aria-label={`${documentName} ${orderNumber}`}>
      <div className="order-ack-shell">
        <div className="order-ack-actions">
          <div>
            <strong>{documentName} {orderNumber}</strong>
            <span>Förhandsgranska, skriv ut eller välj “Spara som PDF” i utskriftsdialogen.</span>
          </div>
          <div className="order-ack-action-buttons">
            <button type="button" className="order-ack-secondary" onClick={onClose}>Stäng</button>
            <button type="button" className="order-ack-primary" onClick={printDocument}>Skriv ut / spara PDF</button>
          </div>
        </div>

        <div className="order-ack-paper" id="order-ack-print-area">
          <header className="order-ack-header">
            <div>
              <div className="order-ack-kicker">{isQuote ? "OFFERT" : isDeliveryNote ? "FÖLJESEDEL" : isWorkOrder ? "ARBETSORDER" : "ORDERERKÄNNANDE"}</div>
              <div className="order-ack-number-row">
                <h1>{orderNumber}</h1>
                {!isQuote && <div className="order-ack-barcode" aria-label={`Streckkod för order ${orderNumber}`}>
                  <svg ref={barcodeRef} />
                </div>}
              </div>
            </div>
            <div className="order-ack-supplier">
              <img src="/jsf-logo.jpg" alt="Jönköpings Skyltfabrik" />
              <strong>Jönköpings Skyltfabrik</strong>
              <span>Gammavägen 1</span>
              <span>556 52 Jönköping</span>
            </div>
              <div className="order-ack-meta-grid">
                <div><span>{isQuote ? "Offertdatum" : "Orderdatum"}</span><strong>{date(order.approvedAt || order.createdAt)}</strong></div>
                <div><span>{isQuote ? "Offertnummer" : "Ordernummer"}</span><strong>{orderNumber}</strong></div>
                {getOrderDetails(order).customerReference ? <div><span>Kundens referens</span><strong>{getOrderDetails(order).customerReference}</strong></div> : null}
                {confirmedDelivery ? <div><span>Leveransdatum</span><strong>{date(confirmedDelivery)}</strong></div> : null}
                {confirmedInstallation ? <div><span>Montagedatum</span><strong>{date(confirmedInstallation)}</strong></div> : null}
              </div>
            {(order.orderer?.purchaserName || order.orderer?.purchaserPhone || order.orderer?.purchaserEmail) && (
              <section className="order-ack-purchaser" aria-label="Beställare">
                <h2>Beställare</h2>
                <div><span>Namn</span><strong>{valueOrDash(order.orderer?.purchaserName)}</strong></div>
                <div><span>Telefon</span><strong>{valueOrDash(order.orderer?.purchaserPhone)}</strong></div>
                <div><span>Mejl</span><strong>{valueOrDash(order.orderer?.purchaserEmail)}</strong></div>
              </section>
            )}
          </header>

          {badgeOrder&&<section className="order-ack-object"><h2>Leveransadress</h2><div className="order-ack-object-grid"><div className="wide"><strong style={{whiteSpace:"pre-line"}}>{shippingLines.join("\n")}</strong></div><div><span>Ansvarsnummer</span><strong>{valueOrDash(order.orderer?.accountNumber)}</strong></div></div></section>}
          {!badgeOrder&&(getOrderCustomer(order) || order.orderer?.ordererName || order.orderer?.ordererEmail || order.orderer?.ordererPhone || order.orderer?.accountNumber || getOrderDetails(order).projectName || getOrderDetails(order).projectCode || getOrderDetails(order).managementObject || getOrderDetails(order).targetPoint || getOrderDetails(order).property || getOrderDetails(order).building || getOrderDetails(order).floor || getOrderDetails(order).room || getOrderDetails(order).requestedCompletionDate || getOrderDetails(order).requestedExecutionNote) ? (
            <section className="order-ack-object">
              <h2>Kund / kontakt / projekt / objekt</h2>
              <div className="order-ack-object-grid">
                <div><span>Kund</span><strong>{valueOrDash(getOrderCustomer(order))}</strong></div>
                <div><span>Kontakt</span><strong>{valueOrDash(order.orderer?.ordererName)}</strong></div>
                <div><span>E-post</span><strong>{valueOrDash(order.orderer?.ordererEmail)}</strong></div>
                <div><span>Telefon</span><strong>{valueOrDash(order.orderer?.ordererPhone)}</strong></div>
                <div><span>Ansvarsnummer</span><strong>{valueOrDash(order.orderer?.accountNumber)}</strong></div>
                <div><span>Projekt</span><strong>{valueOrDash(getOrderDetails(order).projectName)}</strong></div>
                <div><span>Projektkod</span><strong>{valueOrDash(getOrderDetails(order).projectCode)}</strong></div>
                <div><span>Förvaltningsobjekt</span><strong>{valueOrDash(getOrderDetails(order).managementObject)}</strong></div>
                <div><span>Målpunkt</span><strong>{valueOrDash(getOrderDetails(order).targetPoint)}</strong></div>
                <div><span>Fastighet</span><strong>{valueOrDash(getOrderDetails(order).property)}</strong></div>
                <div><span>Byggnad / hus</span><strong>{valueOrDash(getOrderDetails(order).building)}</strong></div>
                <div><span>Plan</span><strong>{valueOrDash(getOrderDetails(order).floor)}</strong></div>
                <div><span>Rum</span><strong>{valueOrDash(getOrderDetails(order).room)}</strong></div>
                <div><span>Prioritet</span><strong>{getOrderDetails(order).priority === "snarast" ? "Snarast" : getOrderDetails(order).priority === "datum" ? `Önskat datum${getOrderDetails(order).requestedCompletionDate ? `: ${getOrderDetails(order).requestedCompletionDate}` : ""}` : "Planeringsbar"}</strong></div>
                {getOrderDetails(order).requestedExecutionNote ? <div className="wide"><span>Utförande / tid</span><strong>{order.orderDetails.requestedExecutionNote}</strong></div> : null}
              </div>
            </section>
          ) : null}

          {order.orderer?.messageToSupplier ? (
            <section className="order-ack-message">
              <h2>Beskrivning</h2>
              <p>{order.orderer.messageToSupplier}</p>
            </section>
          ) : null}

          <section className="order-ack-lines">
            <table>
              <thead>
                <tr>
                  <th className="ack-col-art">Art.nr</th>
                  <th>Beskrivning</th>
                  <th className="ack-col-qty">Antal</th>
                  {isInternalDocument && <th className="ack-col-qty ack-col-delivered">Lev. antal</th>}
                  {!isInternalDocument && <th className="ack-col-price">Á-pris</th>}
                  {!isInternalDocument && <th className="ack-col-total">Summa</th>}
                </tr>
              </thead>
              <tbody>
                {(order.cart || []).map((item, index) => {
                  const quantity = Math.max(1, Number(item.quantity) || 1);
                  const unitPrice = Number(item.unitPrice || 0);
                  const lineTotal = Number(item.lineTotal ?? unitPrice * quantity);
                  const details = itemDescriptionRows(item, isQuote);
                  return (
                    <tr key={item.id || `${item.articleNumber || "item"}-${index}`}>
                      <td>{valueOrDash(item.articleNumber)}</td>
                      <td>
                        <div className="order-ack-item-title">{itemTitle(item)}</div>
                        {details.length ? (
                          <div className="order-ack-item-details">
                            {details.map((row, rowIndex) => (
                              <div key={`${row.label}-${rowIndex}`}>
                                {row.label ? <b>{row.label}: </b> : null}{valueOrDash(row.value)}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="ack-number">{quantity}</td>
                      {isInternalDocument && <td className="ack-number">{quantity}</td>}
                      {!isInternalDocument && <td className="ack-number">{money(unitPrice)}</td>}
                      {!isInternalDocument && <td className="ack-number"><strong>{money(lineTotal)}</strong></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="order-ack-summary">
            <div className="order-ack-summary-note">
              <span>Totalt antal</span>
              <strong>{totalQuantity} st</strong>
            </div>
            {!isInternalDocument && <div className="order-ack-summary-total">
              <span>Ordersumma</span>
              <strong>{money(order.orderTotal)}</strong>
            </div>}
          </section>

          <footer className="order-ack-footer">
            <div>
              <strong>Jönköpings Skyltfabrik</strong>
              <span>{isDeliveryNote ? "Följesedel för leverans" : isWorkOrder ? "Internt produktionsunderlag" : "Tack för er beställning."}</span>
            </div>
            <div>
              <span>{isQuote ? "Offertnummer" : "Ordernummer"}</span>
              <strong>{orderNumber}</strong>
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        .order-ack-overlay{position:fixed;inset:0;z-index:99999;background:rgba(8,18,14,.72);backdrop-filter:blur(5px);padding:22px;overflow:auto;font-family:Arial,sans-serif;color:#171a18}
        .order-ack-shell{max-width:1040px;margin:0 auto}.order-ack-actions{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:20px;background:#10251d;color:#fff;border-radius:14px;padding:13px 15px;margin-bottom:14px;box-shadow:0 12px 35px rgba(0,0,0,.18)}.order-ack-actions>div:first-child{display:grid;gap:3px}.order-ack-actions strong{font-size:13px}.order-ack-actions span{font-size:10px;color:#c8d6cf}.order-ack-action-buttons{display:flex;gap:8px}.order-ack-action-buttons button{height:38px;border-radius:9px;padding:0 14px;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.order-ack-secondary{border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff}.order-ack-primary{border:0;background:#43a77a;color:#fff}
        .order-ack-paper{width:210mm;min-height:297mm;margin:0 auto;background:#fff;box-sizing:border-box;padding:18mm 17mm 16mm;box-shadow:0 18px 55px rgba(0,0,0,.28);display:flex;flex-direction:column}
        .order-ack-header{display:grid;grid-template-columns:minmax(0,1fr) 58mm;gap:5mm 12mm;align-items:start;padding-bottom:2mm;border-bottom:0}.order-ack-kicker{font-size:9px;letter-spacing:.16em;font-weight:800;color:#176b4a;margin-bottom:3mm}.order-ack-number-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8mm;margin:0}.order-ack-header h1{font-size:27px;letter-spacing:-.02em;margin:0;white-space:nowrap}.order-ack-barcode{width:48mm;display:flex;align-items:center;justify-content:flex-end}.order-ack-barcode svg{display:block;width:48mm;max-width:100%;height:12mm}.order-ack-meta-grid{grid-column:1;display:grid;align-content:start;grid-template-columns:1fr 1fr;gap:4mm 8mm}.order-ack-meta-grid div{display:grid;gap:1mm}.order-ack-meta-grid span{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#747c77;font-weight:700}.order-ack-meta-grid strong{font-size:10px}.order-ack-supplier{text-align:right;display:grid;justify-items:end;gap:1mm;font-size:9px;line-height:1.35;color:#404641}.order-ack-supplier img{height:11mm;max-width:52mm;object-fit:contain;margin-bottom:3mm}.order-ack-supplier strong{font-size:11px;color:#171a18}
        .order-ack-purchaser{grid-column:2;min-width:0;box-sizing:border-box;padding:3mm 4mm;background:#f7f8f7;border:1px solid #e1e5e2;border-radius:2mm;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}.order-ack-purchaser h2{font-size:8px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#706b64;margin:0 0 2mm}.order-ack-purchaser>div{display:grid;gap:.6mm;margin-top:1.5mm;min-width:0}.order-ack-purchaser span{font-size:7px;color:#7a756e}.order-ack-purchaser strong{font-size:9px;font-weight:400;color:#353535;line-height:1.4;overflow-wrap:anywhere}
        .order-ack-address-grid{display:grid;grid-template-columns:1fr 1fr;gap:16mm;padding:5mm 0 7mm}.order-ack-address-grid h2,.order-ack-message h2,.order-ack-object h2{font-size:8px;text-transform:uppercase;letter-spacing:.10em;color:#176b4a;margin:0 0 3mm}.order-ack-address-grid p{font-size:9.5px;margin:0 0 1.2mm;line-height:1.4}.order-ack-spaced{margin-top:2.5mm!important}.order-ack-object{padding:4mm 5mm;background:#f7f8f7;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:1px solid #e1e5e2;border-radius:3mm;margin-top:7mm;margin-bottom:0}.order-ack-object-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm 5mm}.order-ack-object-grid div{display:grid;gap:.8mm}.order-ack-object-grid div.wide{grid-column:1/-1}.order-ack-object-grid span{font-size:7px;text-transform:uppercase;letter-spacing:.06em;color:#7a817d;font-weight:700}.order-ack-object-grid strong{font-size:8.8px;line-height:1.35;color:#252a27}.order-ack-message{box-sizing:border-box;width:100%;margin-left:0;padding:4mm 5mm;background:#f5f7f5;border-radius:3mm;margin-bottom:7mm}.order-ack-message p{white-space:pre-wrap;font-size:9px;line-height:1.5;margin:0;color:#3f4641}
        .order-ack-lines{margin-top:8mm;flex-shrink:0}.order-ack-lines table{width:100%;border-collapse:collapse;table-layout:fixed}.order-ack-lines thead{display:table-header-group}.order-ack-lines th{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#606963;text-align:left;border-bottom:1.5px solid #263c32;padding:0 2mm 2.5mm}.order-ack-lines td{font-size:8.7px;line-height:1.38;vertical-align:top;border-bottom:1px solid #e3e7e4;padding:3.3mm 2mm}.order-ack-lines tr{break-inside:avoid;page-break-inside:avoid}.order-ack-lines th:first-child,.order-ack-lines td:first-child{padding-left:0}.order-ack-lines th:last-child,.order-ack-lines td:last-child{padding-right:0}.ack-col-art{width:20mm}.ack-col-qty{width:14mm;text-align:center!important}.ack-col-delivered{width:18mm}.ack-col-price{width:25mm;text-align:right!important}.ack-col-total{width:27mm;text-align:right!important}.ack-number{text-align:right}.order-ack-lines td:nth-child(3),.order-ack-lines td:nth-child(4):last-child{text-align:center}.order-ack-item-title{font-weight:700;color:#171a18;margin-bottom:1mm}.order-ack-item-details{display:grid;gap:.5mm;color:#555e58;font-size:7.8px}.order-ack-item-details b{font-weight:700;color:#78807b}
        .order-ack-summary{display:grid;grid-template-columns:1fr auto;align-items:end;gap:10mm;margin-top:7mm;padding-top:5mm;border-top:1.5px solid #263c32}.order-ack-summary-note{display:grid;gap:1mm;font-size:8px;color:#69716c}.order-ack-summary-note strong{font-size:10px;color:#171a18}.order-ack-summary-total{min-width:58mm;display:flex;align-items:baseline;justify-content:space-between;gap:10mm}.order-ack-summary-total span{font-size:9px;font-weight:700}.order-ack-summary-total strong{font-size:17px;color:#176b4a}
        .order-ack-footer{margin-top:auto;padding-top:4mm;border-top:1px solid #dfe3e0;display:flex;justify-content:space-between;gap:10mm;color:#737b76;font-size:8px}.order-ack-footer>div{display:grid;gap:.7mm}.order-ack-footer strong{color:#353c38;font-size:8.5px}.order-ack-footer>div:last-child{text-align:right}
        @media(max-width:900px){.order-ack-overlay{padding:10px}.order-ack-paper{transform-origin:top left}.order-ack-actions{align-items:stretch;flex-direction:column}.order-ack-action-buttons{width:100%}.order-ack-action-buttons button{flex:1}}
        @media print{
          @page{size:A4 portrait;margin:16mm 17mm 15mm}
          html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
          body *{visibility:hidden!important}
          body:has(.order-ack-overlay) *:not(:has(#order-ack-print-area)):not(.order-ack-overlay):not(.order-ack-overlay *){display:none!important}
          body:has(.order-ack-overlay) *:has(#order-ack-print-area){display:block!important;position:static!important;height:auto!important;max-height:none!important;overflow:visible!important;transform:none!important;margin:0!important;padding:0!important}
          .order-ack-overlay,.order-ack-overlay *{visibility:visible!important}
          .order-ack-actions{display:none!important}
          .order-ack-overlay{position:absolute!important;inset:0!important;background:#fff!important;padding:0!important;overflow:visible!important;backdrop-filter:none!important}
          .order-ack-shell{max-width:none!important;margin:0!important}.order-ack-paper{width:100%!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;box-shadow:none!important;display:block!important;overflow:visible!important}
          .order-ack-lines{display:block!important;break-inside:auto!important;page-break-inside:auto!important;overflow:visible!important}.order-ack-lines table,.order-ack-lines tbody{break-inside:auto!important;page-break-inside:auto!important}.order-ack-lines td{overflow-wrap:anywhere;white-space:normal}.order-ack-footer{margin-top:8mm!important;break-inside:avoid!important}
          .order-ack-lines thead{display:table-header-group!important}.order-ack-lines tr{break-inside:avoid!important;page-break-inside:avoid!important}.order-ack-header,.order-ack-address-grid,.order-ack-object,.order-ack-message,.order-ack-summary{break-inside:avoid!important;page-break-inside:avoid!important}
          .order-ack-barcode{width:48mm!important}.order-ack-barcode svg{width:48mm!important;height:12mm!important}
        }
      `}</style>
    </div></div>, document.body
  );
}

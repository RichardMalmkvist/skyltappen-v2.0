import "./publicPortal.css";

export default function PageContainer({ children, variant, className = "" }) {
  return (
    <div
      className={[variant === "public" ? "jsf-public-shell" : "", className, variant === "public" && className.includes("jsf-calm-home-shell") ? "jsf-storefront-light" : ""].filter(Boolean).join(" ") || undefined}
      style={{
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "30px 20px 60px",
      }}
    >
      {children}
    </div>
  );
}

import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";

export default function FutureModulePage({ title, description, active="dashboard", ...nav }) {
  return (
    <PageContainer>
      <AdminLayout active={active} {...nav}>
        <main className="future-main">
          <div className="future-kicker">JSF FLOW</div>
          <h1>{title}</h1>
          
          <section><strong>Modulen är förberedd</strong></section>
        </main>
        <style>{`
          .future-main{padding:42px;max-width:1100px;color:#171d1a}.future-kicker{font-size:10px;letter-spacing:.16em;font-weight:800;color:#718079}.future-main h1{font-size:38px;letter-spacing:-.035em;margin:7px 0 8px}.future-main>p{color:#69736e;max-width:720px;line-height:1.6;margin:0 0 25px}.future-main section{background:#fff;border:1px solid #e6e9e6;border-radius:14px;padding:22px;display:grid;gap:6px;box-shadow:0 8px 25px rgba(25,35,30,.04)}.future-main section strong{font-size:14px}.future-main section span{font-size:12px;color:#77807b}@media(max-width:720px){.future-main{padding:25px 16px}.future-main h1{font-size:31px}}
        `}</style>
      </AdminLayout>
    </PageContainer>
  );
}

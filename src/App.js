import AdminStatisticsPage from "./pages/admin/AdminStatisticsPage";
import {showFieldError} from "./components/forms/InlineValidation";
import { getNameBadgeCartAdditions } from "./data/nameBadge0201";
import AdminBadgeProductionPage from "./pages/admin/AdminBadgeProductionPage";
import {isBadgeOrder,isBadgeItem,normalizeBadgeDelivery} from "./data/badgeProduction";
import AdminDrawingLibraryPage from "./pages/admin/AdminDrawingLibraryPage";
import OrderNotifications from "./components/orders/OrderNotifications";
import { purchaserFromAccount, syncPurchaserAccount } from "./data/purchaserDetails";
import { prepareCartFlight } from "./components/products/cartFlight";
import "./styles/deviceLayout.css";
import "./styles/publicMotion.css";
import "./styles/publicOrdering.css";
import { checkoutFieldErrors,productErrorField } from "./data/publicFormValidation";
import { getPublicCategories } from "./data/categoryAdmin";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import PageContainer from "./components/layout/PageContainer";
import { printStyle } from "./styles/printStyles";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RoleWorkspace from "./pages/RoleWorkspace";
import ReadOnlyArticlesPage from "./pages/ReadOnlyArticlesPage";
import { canOpenPage } from "./data/permissions";
import AccountProfilePage from "./pages/AccountProfilePage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import FutureModulePage from "./pages/admin/FutureModulePage";
import AdminPlanningPage from "./pages/admin/AdminPlanningPage";
import AdminArticleGroupsPage from "./pages/admin/AdminArticleGroupsPage";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage";
import AdminSymbolsPage from "./pages/admin/AdminSymbolsPage";
import AdminApprovalOrdersPage from "./pages/admin/AdminApprovalOrdersPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import CartPage from "./pages/CartPage";
import ProductFormPage from "./pages/ProductFormPage";
import {
  getProductTypeLabel,
  isProfessionProductType,
} from "./data/productHelpers";
import {
  EMPTY_DELIVERY,
  EMPTY_ORDERER,
  EMPTY_ORDER_DETAILS,
  getEmptyProductForm,
  getProfessionInitialForm,
} from "./data/formDefaults";
import {
  createCartItem,
  createDirectCartItem,
  validateCurrentItem,
} from "./data/cartHelpers";
import {
  getProductById,
  getProductFlowType,
  getProductsByCategory,
  isProfessionFlowProduct,
} from "./data/products";
import {
  getCartItemDisplayRows,
  getPackingSlipDescriptionRows,
} from "./data/orderDisplayHelpers";
import PackingSlipModal from "./components/orders/PackingSlipModal";
import { AdminLayout } from "./components/admin/AdminNavigation";
import { guestCanOrder } from "./data/catalogAccess";
import { hasProofOnlyItems } from "./data/catalogVisibility";
import { fetchCatalog, setCatalogAccessToken, getCatalogSnapshot } from "./data/catalogStore";

export default function App() {
  const [notificationSession, setNotificationSession] = useState(null);
  const [accountOrderUpdate, setAccountOrderUpdate] = useState(null);
  const [projectTarget,setProjectTarget]=useState(null);
  return <>
    <AppContent onNotificationSession={setNotificationSession} accountOrderUpdate={accountOrderUpdate} projectTarget={projectTarget}/>
    {notificationSession && <OrderNotifications key={notificationSession.token} session={notificationSession} onOrdersUpdated={setAccountOrderUpdate} onOpenProject={(id,proofId)=>setProjectTarget({id,proofId,at:Date.now(),token:notificationSession.token})}/>}
  </>;
}

function AppContent({ onNotificationSession, accountOrderUpdate, projectTarget }) {
  const [step, setStep] = useState("landing");
  const [loginArrival, setLoginArrival] = useState(false);
  useEffect(() => {
    if (!loginArrival) return;
    document.body.classList.add("jsf-account-arrival");
    const timer = window.setTimeout(() => setLoginArrival(false), 650);
    return () => { window.clearTimeout(timer); document.body.classList.remove("jsf-account-arrival"); };
  }, [loginArrival]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [featuredDirectProductId, setFeaturedDirectProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartAddedItem, setCartAddedItem] = useState(null);
  const cartFlight = useRef(null);
  useEffect(() => { setCartAddedItem(null); }, [step]);
  const [successMessage, setSuccessMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [openedFromAutoCategory, setOpenedFromAutoCategory] = useState(false);

  const [productForm, setProductForm] = useState(getEmptyProductForm());
  const [orderer, setOrderer] = useState(EMPTY_ORDERER);
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  const [orderDetails, setOrderDetails] = useState(EMPTY_ORDER_DETAILS);

  const [adminPassword, setAdminPassword] = useState("");
  const [accountUser, setAccountUser] = useState(null);
  const previousPurchaserAccount = useRef(null);
  useEffect(() => {
    const previous = previousPurchaserAccount.current;
    if (accountUser || previous) setOrderer(current => syncPurchaserAccount(current, accountUser, previous));
    previousPurchaserAccount.current = accountUser;
  }, [accountUser]);
  const [accountToken, setAccountToken] = useState("");
  const [myOrders, setMyOrders] = useState([]);
  const [projectOpenTarget,setProjectOpenTarget]=useState(null);
  const [buyerOrderTarget,setBuyerOrderTarget]=useState(null);
  useEffect(()=>{if(projectTarget&&projectTarget.token===accountToken){setProjectOpenTarget(projectTarget);setStep('projectsAdmin');window.scrollTo(0,0);}},[projectTarget,accountToken]);
  useEffect(() => {
    onNotificationSession(accountUser && accountToken ? { user: accountUser, token: accountToken } : null);
  }, [accountUser, accountToken, onNotificationSession]);
  useEffect(() => {
    if (accountOrderUpdate?.token === accountToken) setMyOrders(accountOrderUpdate.orders);
  }, [accountOrderUpdate, accountToken]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading,setOrdersLoading]=useState(false);
  const orderRequests=useRef(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPackingSlip, setShowPackingSlip] = useState(false);
  const [packingSlipOrder, setPackingSlipOrder] = useState(null);
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminPasswordSearch, setAdminPasswordSearch] = useState("");
  const [ordersSortBy, setOrdersSortBy] = useState("createdAt");
  const [ordersSortDirection, setOrdersSortDirection] = useState("desc");
  const [catalogVersion, setCatalogVersion] = useState(0);

  const isSubmittingRef = useRef(false);

  const refreshCatalog = useCallback(async (sessionToken = accountToken) => {
    try {
      await fetchCatalog(sessionToken);
      setSelectedBadge(previous=>previous?(getProductById(previous.id)||previous):previous);
      setCatalogVersion((version) => version + 1);
    } catch (error) {
      console.error(error);
    }
  }, [accountToken]);

  useEffect(() => {
    let refreshing=false;
    const refresh=async()=>{if(refreshing||document.visibilityState==='hidden')return;refreshing=true;try{await refreshCatalog();}finally{refreshing=false;}};
    refresh();
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  }, [refreshCatalog]);

  // Uppdatera orderlistan när en inloggad medarbetare öppnar en ordervy
  // eller återvänder till fliken. Gästbeställningar ska också synas direkt.
  useEffect(() => {
    if (!accountToken || !["admin", "personal"].includes(accountUser?.role)) return;
    const orderPages = ["statisticsAdmin", "adminHome", "orders", "approvalOrders", "planning", "productionOrders", "badgeProduction"];
    if (!orderPages.includes(step)) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/orders", {
          headers: { "x-admin-password": `account:${accountToken}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setAdminError(data.message || "Kunde inte hämta beställningar.");
          return;
        }
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setAdminError("");
      } catch {
        if (active) setAdminError("Kunde inte ansluta till orderservern. Kontrollera att backend körs.");
      }
    };
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, [step, accountToken, accountUser?.role]);

  function showTemporaryMessage(message, setter = setSuccessMessage) {
    setter(message);
    setTimeout(() => {
      setter("");
    }, 3000);
  }

  function addCartItem(item, source) {
    if (hasProofOnlyItems([item], getCatalogSnapshot())) return;
    if (!accountToken && !guestCanOrder(item, getCatalogSnapshot())) return;
    cartFlight.current?.cancel();
    try { cartFlight.current = prepareCartFlight(source); } catch { cartFlight.current = null; }
    setCart((prev) => [...prev, ...getNameBadgeCartAdditions(item)]);
    setCartAddedItem(item);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth" });
  }

  function resetProductForm() {
    setProductForm(getEmptyProductForm());
  }

  function clearSelectedProduct() {
    setFeaturedDirectProductId(null);
    setSelectedProductType(null);
    setSelectedBadge(null);
    setOpenedFromAutoCategory(false);
  }

  function goToLandingFromLogo() {
    setSelectedCategory(null);
    clearSelectedProduct();
    setSuccessMessage("");
    resetProductForm();
    setStep("landing");
    scrollToTop();
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  function getHeaderProps(options = {}) {
    const {
      showCartButton = true,
      showLoginButton = true,
      disableLoginAction = false,
    } = options;

    return {
      cartCount,
      onCartClick: () => { setCartAddedItem(null); setStep("cart"); },
      onSearchProduct: openFeaturedProduct,
      onSelectCategory: openCategory,
      activeCategoryId: selectedCategory?.id,
      cartAddedItem,
      cartFlight: cartFlight.current,
      onCloseCartAdded: () => setCartAddedItem(null),
      onLoginClick: disableLoginAction ? () => {} : () => setStep(accountUser ? "adminHome" : "adminLogin"),
      onLogoClick: goToLandingFromLogo,
      showCartButton,
      showLoginButton,
    };
  }

  function openCategory(category, options = {}) {
    const { skipAutoOpen = false } = options;

    setSelectedCategory(category);
    clearSelectedProduct();
    setSuccessMessage("");
    resetProductForm();

    if (!skipAutoOpen && category?.autoOpenSingleProduct) {
      const categoryProducts = getProductsByCategory(category.id);

      if (categoryProducts.length === 1) {
        setOpenedFromAutoCategory(true);
        openProduct(categoryProducts[0], { preserveAutoCategoryFlag: true });
        return;
      }
    }

    setStep("catalog");
    scrollToTop();
  }

  function openFeaturedProduct(product) {
    const category = getPublicCategories().find((item) => item.id === product.categoryId);
    if (!category || !product?.isImplemented || product.adminArchived) return;
    setSelectedCategory(category);
    if (getProductFlowType(product) === "direct") {
      // Show only the chosen direct-order article, with its own quantity and cart controls.
      clearSelectedProduct();
      setFeaturedDirectProductId(product.id);
      setStep("catalog");
      scrollToTop();
    } else {
      setFeaturedDirectProductId(null);
      openProduct(product);
    }
  }

  function openNameBadges() {
    openCategory({
      id: "namnbrickor",
      title: "Namnbrickor",
    });
  }

  function openProduct(product, options = {}) {
    const { preserveAutoCategoryFlag = false } = options;

    if (!product || product.storefrontOrderable===false || (!accountToken && !guestCanOrder({badgeId:product.id,articleNumber:product.articleNumber}, getCatalogSnapshot()))) return;

    const flowType = getProductFlowType(product);

    setSelectedBadge(product);
    setSuccessMessage("");

    if (!preserveAutoCategoryFlag) {
      setOpenedFromAutoCategory(false);
    }

    if (flowType === "direct" && !options.previewProfession) {
      addDirectProductToCart(product, 1, {}, options.source);
      return;
    }

    if (flowType === "profession" || product.previewType === "profession") {
      setSelectedProductType({
        id: "yrkestitelsskyltar",
        title: product.name,
        flowType: "profession",
      });
      setProductForm(getProfessionInitialForm(product));
      setStep("form");
      scrollToTop();
      return;
    }

    setSelectedProductType({
      id: product.productType || product.categoryId,
      title: product.name,
      flowType: product.flowType || "form",
    });
    resetProductForm();
    setStep("form");
    scrollToTop();
  }

  function addDirectProductToCart(product, quantity, directFieldValues = {}, source) {
    const newItem = createDirectCartItem(product, quantity, directFieldValues);
    addCartItem(newItem, source);
    showTemporaryMessage(`${product.name} lades i kundkorgen.`);
  }

  async function handleAccountLogin(user, token) {
    setCatalogAccessToken(token);
    await refreshCatalog(token);
    setAccountUser(user);
    setAccountToken(token);
    setAdminPassword(`account:${token}`);
    setIsAdminLoggedIn(user.role === "admin");
    if (user.role === "admin" || user.role === "personal") {
      await fetchOrders(`account:${token}`);
    } else {
      try {
        const response = await fetch("/api/account/orders", { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        setMyOrders(response.ok ? data.orders || [] : []);
      } catch { setMyOrders([]); }
    }
    setLoginArrival(true);
    setStep("adminHome");
    scrollToTop();
  }

  function logoutAccount() {
    setCatalogAccessToken("");
    setCart(previous => previous.filter(item => guestCanOrder(item, getCatalogSnapshot())));
    setShowOrderSummary(false);
    setSelectedCategory(null);
    clearSelectedProduct();
    setCatalogVersion(version => version + 1);
    refreshCatalog("");
    if (accountToken) fetch("/api/account/logout", { method: "POST", headers: { Authorization: `Bearer ${accountToken}` } }).catch(() => {});
    setAccountUser(null);
    setAccountToken("");
    setAdminPassword("");
    setIsAdminLoggedIn(false);
    setOrders([]);
    setMyOrders([]);
    setStep("landing");
  }

  async function fetchOrders(passwordToUse = adminPassword) {
    orderRequests.current+=1;setOrdersLoading(true);setAdminError("");
    try {
      const response = await fetch("/api/orders", {
        headers: {
          "x-admin-password": passwordToUse,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.message || "Kunde inte hämta beställningar.");
        return;
      }

      setOrders(data.orders || []);
    } catch {
      setAdminError("Kunde inte hämta beställningar.");
    } finally {orderRequests.current-=1;if(!orderRequests.current)setOrdersLoading(false);}
  }

  async function updateOrderStatus(orderId, newStatus) {
    setAdminError("");
    setIsUpdatingOrderStatus(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.message || "Kunde inte uppdatera status.");
        return;
      }

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? data.order : order))
      );

      setSelectedOrder(null);
    } catch {
      setAdminError("Kunde inte uppdatera status.");
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  }

  async function deleteOrder(orderId) {
    const confirmed = window.confirm("Vill du verkligen ta bort beställningen?");

    if (!confirmed) return;

    setAdminError("");

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.message || "Kunde inte ta bort beställningen.");
        return;
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setSelectedOrder(null);
    } catch {
      setAdminError("Kunde inte ta bort beställningen.");
    }
  }

  async function submitOrderToBackend() {
    if (validateOrderDetails()) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const submittingBadgeOnly=cart.length>0&&cart.every(isBadgeItem);
    const checkoutDetails=submittingBadgeOnly?{...EMPTY_ORDER_DETAILS,customer:delivery.company||""}:orderDetails;
    const checkoutOrderer=submittingBadgeOnly?{...orderer,customer:delivery.company||"",company:delivery.company||"",ordererName:orderer.purchaserName||orderer.ordererName,ordererEmail:orderer.purchaserEmail||orderer.ordererEmail,ordererPhone:orderer.purchaserPhone||orderer.ordererPhone}:orderer;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
        },
        body: JSON.stringify({
          cart,
          orderer: { ...checkoutOrderer, customer: checkoutOrderer.customer || checkoutDetails.customer || checkoutOrderer.company || delivery.company || "" },
          delivery: submittingBadgeOnly?normalizeBadgeDelivery({...delivery,department:""}):{...delivery},
          // Skicka en fristående snapshot så alla projekt-/objektfält alltid följer ordern.
          orderDetails: {
            customerReference: checkoutDetails.customerReference || "",
            projectName: checkoutDetails.projectName || "",
            projectCode: checkoutDetails.projectCode || "",
            managementObject: checkoutDetails.managementObject || "",
            targetPoint: checkoutDetails.targetPoint || "",
            property: checkoutDetails.property || "",
            building: checkoutDetails.building || "",
            floor: checkoutDetails.floor || "",
            room: checkoutDetails.room || "",
            priority: checkoutDetails.priority || "planeringsbar",
            requestedCompletionDate: checkoutDetails.requestedCompletionDate || "",
            requestedExecutionNote: checkoutDetails.requestedExecutionNote || "",
          },
          // Samma fält skickas även på toppnivå som robust fallback.
          customerReference: checkoutDetails.customerReference || "",
          projectName: checkoutDetails.projectName || "",
          projectCode: checkoutDetails.projectCode || "",
          managementObject: checkoutDetails.managementObject || "",
          targetPoint: checkoutDetails.targetPoint || "",
          property: checkoutDetails.property || "",
          building: checkoutDetails.building || "",
          floor: checkoutDetails.floor || "",
          room: checkoutDetails.room || "",
          priority: checkoutDetails.priority || "planeringsbar",
            requestedCompletionDate: checkoutDetails.requestedCompletionDate || "",
          requestedExecutionNote: checkoutDetails.requestedExecutionNote || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Kunde inte spara beställningen.");
        return;
      }

      setShowOrderSummary(false);
      setCart([]);
      setOrderer({ ...EMPTY_ORDERER, ...purchaserFromAccount(accountUser) });
      if (accountToken && data.order) setMyOrders(previous => [...(data.orders || [data.order]), ...previous.filter(order => !(data.orders || [data.order]).some(next=>next.id===order.id))]);
      setDelivery(EMPTY_DELIVERY);
      setOrderDetails(EMPTY_ORDER_DETAILS);
      setSelectedCategory(null);
      clearSelectedProduct();
      resetProductForm();
      setSuccessMessage("");
      setStep("landing");

      showTemporaryMessage(
        `Beställningen är mottagen${(data.orders || [data.order]).every(isBadgeOrder)?" för produktion":(data.orders || [data.order]).some(isBadgeOrder)?". Brickorna hanteras direkt och övriga skyltar går till godkännande":" för godkännande"}. Referens: ${
          data.order?.submissionNumber || data.order?.orderNumber || "-"
        }`,
        setToastMessage
      );

      scrollToTop();
    } catch {
      alert("Kunde inte ansluta till servern.");
    } finally {
      isSubmittingRef.current = false;
    }
  }

  function goBackToLanding() {
    setSelectedBadge(null);
    setSelectedProductType(null);
    setSelectedCategory(null);
    setOpenedFromAutoCategory(false);
    resetProductForm();
    setSuccessMessage("");
    setOrderer((prev) => ({
      ...prev,
      accountNumber: "",
    }));
    setStep("landing");
    scrollToTop();
  }

  function setStepToLanding() {
    setOrderer((prev) => ({
      ...prev,
      accountNumber: "",
    }));
    setSelectedCategory(null);
    clearSelectedProduct();
    resetProductForm();
    setSuccessMessage("");
    setStep("landing");
    scrollToTop();
  }

  function goBackFromForm() {
    setSuccessMessage("");
    setSelectedBadge(null);
    resetProductForm();

    if (openedFromAutoCategory) {
      setSelectedProductType(null);
      setOpenedFromAutoCategory(false);
      setSelectedCategory(null);
      setStep("landing");
      scrollToTop();
      return;
    }

    setStep("catalog");
    scrollToTop();
  }

  function addCurrentItemToCart(source) {
    const error = validateCurrentItem(
      selectedBadge,
      selectedProductType,
      productForm
    );

    if (error) {
      const fieldId=productErrorField(error,selectedBadge);
      const field=fieldId?document.getElementById(fieldId):null;
      if(field){showFieldError(field,error);field.focus();}
      return false;
    }

    const newItem = createCartItem(
      selectedBadge,
      selectedProductType,
      productForm
    );

    addCartItem(newItem, source);

    if (
      isProfessionFlowProduct(selectedBadge) ||
      isProfessionProductType(selectedProductType)
    ) {
      showTemporaryMessage("Yrkestitelsskylten lades i kundkorgen.");
      return true;
    }

    showTemporaryMessage(
      `${selectedBadge?.name || "Produkten"} lades i kundkorgen.`
    );
    resetProductForm();
    return true;
  }

  function updateCartQuantity(itemId, newQuantity) {
    const safeQuantity = Math.max(1, Number(newQuantity) || 1);

    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: safeQuantity } : item
      )
    );
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function validateOrderDetails() {
    if (cart.length === 0) return "Kundkorgen är tom.";
    return Object.values(checkoutFieldErrors(orderer, orderDetails,{badgeOnly:cart.length>0&&cart.every(isBadgeItem),delivery}))[0] || null;
  }

  function renderOrderItemDetails(item) {
    const rows = getCartItemDisplayRows(item);

    return rows.map((row, index) => (
      <div key={`${item.id}-${row.label}-${index}`}>
        <strong>{row.label}:</strong> {row.value}
      </div>
    ));
  }

  function renderPackingSlipDescription(item) {
    const rows = getPackingSlipDescriptionRows(item);

    return rows.map((row, index) => {
      if (!row.label) {
        return <div key={`${item.id}-desc-${index}`}>{row.value}</div>;
      }

      return (
        <div key={`${item.id}-${row.label}-${index}`}>
          <strong>{row.label}:</strong> {row.value}
        </div>
      );
    });
  }

  const adminNavProps = {
    onOpenStatistics: () => { setStep("statisticsAdmin"); scrollToTop(); },
    onOpenDashboard: () => { setStep("adminHome"); scrollToTop(); },
    onOpenBadgeOrders: () => { setStep("badgeProduction"); scrollToTop(); },
    onOpenOrders: () => { setBuyerOrderTarget(null); setStep("orders"); scrollToTop(); },
    onOpenOrder: id => { setBuyerOrderTarget({id}); setStep("orders"); scrollToTop(); },
    initialOrderId: buyerOrderTarget?.id,
    onOpenProject: (id,proofId) => { setProjectOpenTarget({id,proofId,at:Date.now()}); setStep("projectsAdmin"); scrollToTop(); },
    onOpenApprovalOrders: () => { setStep("approvalOrders"); scrollToTop(); },
    onOpenPlanning: () => { setStep("planning"); scrollToTop(); },
    onOpenArticles: () => { setStep("articlesAdmin"); scrollToTop(); },
    onOpenSymbols: () => { setStep("symbolsAdmin"); scrollToTop(); },
    onOpenArticleGroups: () => { setStep("articleGroupsAdmin"); scrollToTop(); },
    onOpenProjects: () => { setProjectOpenTarget(null); setStep("projectsAdmin"); scrollToTop(); },
    onOpenUsers: () => { setStep("usersAdmin"); scrollToTop(); },
    onOpenDrawings: () => { setStep("drawingsAdmin"); scrollToTop(); },
    onOpenSettings: () => { setStep("settingsAdmin"); scrollToTop(); },
    onOpenPortal: () => { setStep("landing"); scrollToTop(); },
    onOpenProfile: () => { setStep("accountProfile"); scrollToTop(); },
    adminPassword,
    role: accountUser?.role || "admin",
    user: accountUser,
    onLogout: accountUser ? logoutAccount : undefined,
    onCatalogChanged: refreshCatalog,
  };

  if (step === "landing") {
    return (
      <LandingPage
        key={`landing-${catalogVersion}`}
        toastMessage={toastMessage}
        getHeaderProps={getHeaderProps}
        selectedCategory={selectedCategory}
        openCategory={openCategory}
        openFeaturedProduct={openFeaturedProduct}
        openNameBadges={openNameBadges}
        primaryButtonStyle={primaryButtonStyle}
        secondaryButtonStyle={secondaryButtonStyle}
        cardStyle={cardStyle}
      />
    );
  }

  if (step === "adminLogin") {
    return (
      <AdminLoginPage
        getHeaderProps={getHeaderProps}
        goBackToLanding={goBackToLanding}
        backButtonStyle={backButtonStyle}
        cardStyle={cardStyle}
        adminPassword={adminPassword}
        inputStyle={inputStyle}
        onAccountLogin={handleAccountLogin}
        primaryButtonStyle={primaryButtonStyle}
      />
    );
  }

  if (step === "drawingsAdmin" && accountUser && canOpenPage(accountUser.role, "drawings")) {
    return <AdminDrawingLibraryPage {...adminNavProps}/>;
  }

  if (step === "statisticsAdmin" && accountUser?.role === "admin") return <AdminStatisticsPage {...adminNavProps} orders={orders} loading={ordersLoading} error={adminError} onRefresh={()=>fetchOrders()}/>;

  if (step === "badgeProduction" && accountUser?.role === "admin") {
    return <AdminBadgeProductionPage orders={orders} orderFetchError={adminError} onOrdersChanged={()=>fetchOrders()} {...adminNavProps}/>;
  }

  if (step === "accountProfile" && accountUser && accountToken) {
    return <AccountProfilePage {...adminNavProps} user={accountUser} token={accountToken} onUserUpdated={setAccountUser} />;
  }

  if (accountUser && accountUser.role !== "admin" && ["adminHome", "orders", "planning", "articlesAdmin", "projectsAdmin", "drawingsAdmin"].includes(step)) {
    const active = step === "adminHome" ? "dashboard" : step === "orders" ? "orders" : step === "planning" ? "planning" : step === "articlesAdmin" ? "articles" : step === "projectsAdmin" ? "projects" : "drawings";
    if (!canOpenPage(accountUser.role, active)) {
      return <RoleWorkspace token={accountToken} role={accountUser.role} user={accountUser} orders={myOrders} {...adminNavProps} />;
    }
    if (active === "projects") return <AdminProjectsPage {...adminNavProps} initialProofId={projectOpenTarget?.proofId} initialProjectId={projectOpenTarget?.id} openRequest={projectOpenTarget?.at} />;
    if (active === "articles") return <ReadOnlyArticlesPage {...adminNavProps} />;
    if (active === "orders" && accountUser.role === "personal") return <AdminOrdersPage loading={ordersLoading} orders={orders.filter(order=>!isBadgeOrder(order))} onOrdersChanged={()=>fetchOrders()} {...adminNavProps} />;
    if (active === "planning" && accountUser.role === "personal") {
      return <AdminPlanningPage orders={orders.filter(order=>!isBadgeOrder(order))} onOrderUpdated={(updated) => setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))} {...adminNavProps} />;
    }
    return <RoleWorkspace token={accountToken} role={accountUser.role} user={accountUser} active={active} orders={accountUser.role === "bestallare" ? myOrders : orders.filter(order=>!isBadgeOrder(order))} {...adminNavProps} />;
  }

  if (accountUser && accountUser.role !== "admin" && ["statisticsAdmin", "approvalOrders", "symbolsAdmin", "articleGroupsAdmin", "usersAdmin", "settingsAdmin", "productionOrders", "badgeProduction"].includes(step)) {
    return <RoleWorkspace token={accountToken} role={accountUser.role} user={accountUser} orders={accountUser.role === "bestallare" ? myOrders : orders.filter(order=>!isBadgeOrder(order))} {...adminNavProps} />;
  }

  if (step === "adminHome") {
    return (
      <AdminDashboardPage onOpenStatistics={adminNavProps.onOpenStatistics}
        orderFetchError={adminError}
        role={adminNavProps.role}
        user={adminNavProps.user}
        onLogout={adminNavProps.onLogout}
        onOpenProfile={adminNavProps.onOpenProfile}
        getHeaderProps={getHeaderProps}
        orders={orders}
        onOpenBadgeOrders={() => {
          setStep("badgeProduction");
          scrollToTop();
        }}
        onOpenProductionOrders={adminNavProps.onOpenOrders}
        onOpenApprovalOrders={() => {
          setStep("approvalOrders");
          scrollToTop();
        }}
        onOpenPlanning={() => {
          setStep("planning");
          scrollToTop();
        }}
        onOpenArticles={() => {
          setStep("articlesAdmin");
          scrollToTop();
        }}
        onOpenSymbols={() => {
          setStep("symbolsAdmin");
          scrollToTop();
        }}
        onOpenArticleGroups={() => {
          setStep("articleGroupsAdmin");
          scrollToTop();
        }}
        onOpenProjects={() => {
          setStep("projectsAdmin");
          scrollToTop();
        }}
        onOpenUsers={() => {
          setStep("usersAdmin");
          scrollToTop();
        }}
        onOpenDrawings={() => { setStep("drawingsAdmin"); scrollToTop(); }}
        onOpenSettings={() => { setStep("settingsAdmin"); scrollToTop(); }}
        onOpenPortal={() => { setStep("landing"); scrollToTop(); }}
        onRefresh={() => fetchOrders()}
      />
    );
  }

  if (step === "articleGroupsAdmin") {
    return (
      <AdminArticleGroupsPage {...adminNavProps} />
    );
  }

  if (step === "articlesAdmin") {
    return (
      <AdminArticlesPage {...adminNavProps} />
    );
  }

  if (step === "symbolsAdmin") {
    return (
      <AdminSymbolsPage {...adminNavProps} />
    );
  }

  if (step === "approvalOrders") {
    return (
      <AdminApprovalOrdersPage
        orderFetchError={adminError}
        orders={orders.filter(order=>!isBadgeOrder(order))}
        adminPassword={adminPassword}
        onOrdersChanged={() => fetchOrders()}
        {...adminNavProps}
      />
    );
  }


  if (step === "orders") {
    return (
      <AdminOrdersPage loading={ordersLoading}
        orderFetchError={adminError}
        orders={orders.filter(order=>!isBadgeOrder(order))}
        adminPassword={adminPassword}
        onOrdersChanged={() => fetchOrders()}
        {...adminNavProps}
      />
    );
  }

  const futureModules = {
    productionOrders: {
      title: "Lagda ordrar",
      description: "Här bygger vi produktionsordrar som har godkänts och skickats vidare till produktion.",
      active: "orders"
    },
    planning: {
      title: "Planering",
      description: "Tvåveckorsplanering för Layout, Produktion, Montering och Packning/Slutleverans.",
      active: "planning"
    },
    projectsAdmin: {
      title: "Projekt & Korrektur",
      description: "Projekt med kunder, artiklar, ritningar, markeringar, anteckningar och planering.",
      active: "projects"
    },
    usersAdmin: {
      title: "Användare & behörigheter",
      description: "Här styr admin vilka användare som får se och göra vad i systemet.",
      active: "users"
    },
    drawingsAdmin: {
      title: "Ritningar",
      description: "Här kommer projektens PDF-ritningar, markeringar och kopplade artiklar att hanteras.",
      active: "drawings"
    },
    settingsAdmin: {
      title: "Inställningar",
      description: "Systeminställningar, roller, behörigheter och gemensamma val.",
      active: "settings"
    },
  };

  if (step === "projectsAdmin") return <AdminProjectsPage {...adminNavProps} initialProofId={projectOpenTarget?.proofId} initialProjectId={projectOpenTarget?.id} openRequest={projectOpenTarget?.at} />;

  if (step === "usersAdmin") return <AdminUsersPage {...adminNavProps} />;

  if (futureModules[step]) {
    return (
      step === "planning" ? <AdminPlanningPage orders={orders.filter(order=>!isBadgeOrder(order))} onOrderUpdated={(updated) => setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))} {...adminNavProps} /> : <FutureModulePage {...futureModules[step]} {...adminNavProps} />
    );
  }

  if (step === "orders") {
    const filteredOrders = orders.filter((order) => {
      const search = adminPasswordSearch.trim().toLowerCase();

      if (!search) return true;

      const customerName = order.orderer?.ordererName?.toLowerCase() || "";
      const email = order.orderer?.ordererEmail?.toLowerCase() || "";
      const accountNumber = order.orderer?.accountNumber?.toLowerCase() || "";
      const company = order.delivery?.company?.toLowerCase() || "";
      const recipient = order.delivery?.recipient?.toLowerCase() || "";
      const city = order.delivery?.city?.toLowerCase() || "";
      const status = order.status?.toLowerCase() || "";
      const orderNumber = order.orderNumber?.toLowerCase() || "";
      const itemsText = (order.cart || [])
        .map((item) => `${item.badgeName} ${item.title || ""} ${item.name || ""}`)
        .join(" ")
        .toLowerCase();

      return (
        customerName.includes(search) ||
        email.includes(search) ||
        accountNumber.includes(search) ||
        company.includes(search) ||
        recipient.includes(search) ||
        city.includes(search) ||
        status.includes(search) ||
        orderNumber.includes(search) ||
        itemsText.includes(search)
      );
    });

    const sortedOrders = [...filteredOrders].sort((a, b) => {
      let aValue = "";
      let bValue = "";

      if (ordersSortBy === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }

      if (ordersSortBy === "status") {
        aValue = a.status || "";
        bValue = b.status || "";
      }

      if (ordersSortBy === "customer") {
        aValue = a.orderer?.ordererName || "";
        bValue = b.orderer?.ordererName || "";
      }

      if (ordersSortBy === "accountNumber") {
        aValue = a.orderer?.accountNumber || "";
        bValue = b.orderer?.accountNumber || "";
      }

      if (ordersSortBy === "email") {
        aValue = a.orderer?.ordererEmail || "";
        bValue = b.orderer?.ordererEmail || "";
      }

      if (ordersSortBy === "city") {
        aValue = a.delivery?.city || "";
        bValue = b.delivery?.city || "";
      }

      if (ordersSortBy === "quantity") {
        aValue = (a.cart || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0
        );
        bValue = (b.cart || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0
        );
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return ordersSortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      const result = String(aValue).localeCompare(String(bValue), "sv");
      return ordersSortDirection === "asc" ? result : -result;
    });

  const orderTotals = orders.reduce(
    (totals, order) => {
      (order.cart || []).forEach((item) => {
        const quantity = Number(item.quantity || 0);

        if (item.productType === "namnbricka") {
          totals.nameBadges += quantity;
        }

        if (
          item.productType === "yrkestitelsskyltar" ||
          item.productType === "yrkestitelsskylt"
        ) {
          totals.professionBadges += quantity;
        }
      });

      return totals;
    },
    {
      nameBadges: 0,
      professionBadges: 0,
    }
  );

    return (
      <PageContainer>
        <AdminLayout active="orders" {...adminNavProps}>
        <div className="admin-orders-page">
        <style>{printStyle}</style>
        <style>{`.admin-orders-page{padding:30px 34px 50px;background:#ffffff;min-height:100vh;color:#171a18}.admin-orders-page>div{max-width:1280px!important}@media(max-width:720px){.admin-orders-page{padding:22px 14px}}`}</style>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(null);
              setShowPackingSlip(false);
              setPackingSlipOrder(null);
              setStep("adminHome");
              scrollToTop();
            }}
            style={backButtonStyle}
          >
            ← Tillbaka
          </button>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <h1 style={{ fontSize: 40, margin: 0 }}>Beställningar</h1>
              <p style={{ margin: "8px 0 0", color: "#555" }}>
                {sortedOrders.length} av {orders.length} beställningar visas
              </p>
              <div
  style={{
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
    marginTop: 10,
    color: "#374151",
    fontSize: 15,
    fontWeight: 600,
  }}
>
  <span>Namnbrickor: {orderTotals.nameBadges}</span>
  <span>Yrkestitelsskyltar: {orderTotals.professionBadges}</span>
</div>
            </div>

            <button
              type="button"
              onClick={() => fetchOrders()}
              style={secondaryButtonStyle}
            >
              Uppdatera
            </button>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "end",
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 18 }}>
                Lista över beställningar
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    htmlFor="ordersSearch"
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    Sök
                  </label>
                  <input
                    id="ordersSearch"
                    type="text"
                    placeholder="Sök beställare, ordernummer, ansvarsnummer..."
                    value={adminPasswordSearch}
                    onChange={(e) => setAdminPasswordSearch(e.target.value)}
                    style={{ ...inputStyle, width: 320, maxWidth: "100%" }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ordersSortBy"
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    Sortera efter
                  </label>
                  <select
                    id="ordersSortBy"
                    value={ordersSortBy}
                    onChange={(e) => setOrdersSortBy(e.target.value)}
                    style={{ ...inputStyle, width: 220 }}
                  >
                    <option value="createdAt">Datum</option>
                    <option value="status">Status</option>
                    <option value="customer">Kund</option>
                    <option value="accountNumber">Ansvarsnummer</option>
                    <option value="email">E-post</option>
                    <option value="city">Postort</option>
                    <option value="quantity">Antal</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ordersSortDirection"
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    Ordning
                  </label>
                  <select
                    id="ordersSortDirection"
                    value={ordersSortDirection}
                    onChange={(e) => setOrdersSortDirection(e.target.value)}
                    style={{ ...inputStyle, width: 180 }}
                  >
                    <option value="desc">Fallande</option>
                    <option value="asc">Stigande</option>
                  </select>
                </div>
              </div>
            </div>

            {!isAdminLoggedIn ? (
              <div>Du måste logga in först.</div>
            ) : sortedOrders.length === 0 ? (
              <div>Inga beställningar hittades.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 1150,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#009846", color: "black" }}>
                      <th style={tableHeaderStyle}>Skapad</th>
                      <th style={tableHeaderStyle}>Ordernummer</th>
                      <th style={tableHeaderStyle}>Typ</th>
                      <th style={tableHeaderStyle}>Antal</th>
                      <th style={tableHeaderStyle}>Beställare</th>
                      <th style={tableHeaderStyle}>Ansvarsnummer</th>
                      <th style={tableHeaderStyle}>E-post</th>
                      <th style={tableHeaderStyle}>Leveransadress</th>
                      <th style={tableHeaderStyle}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedOrders.map((order, index) => {
                      const totalQuantity = (order.cart || []).reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0
                      );

                      const types = Array.from(
                        new Set(
                          (order.cart || []).map((item) =>
                            getProductTypeLabel(item.productType)
                          )
                        )
                      ).join(", ");

                      const deliveryText = [
                        order.delivery?.company,
                        order.delivery?.recipient,
                        order.delivery?.address,
                        order.delivery?.postalCode,
                        order.delivery?.city,
                      ]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            background:
                              selectedOrder?.id === order.id
                                ? "#e8f5e9"
                                : index % 2 === 0
                                ? "#fafafa"
                                : "white",
                            borderBottom: "1px solid #e5e5e5",
                            verticalAlign: "top",
                            cursor: "pointer",
                          }}
                        >
                          <td style={tableCellStyle}>
                            {new Date(order.createdAt).toLocaleDateString("sv-SE")}
                          </td>
                          <td style={tableCellStyle}>{order.orderNumber || "-"}</td>
                          <td style={tableCellStyle}>{types || "-"}</td>
                          <td style={tableCellStyle}>{totalQuantity}</td>
                          <td style={tableCellStyle}>
                            {order.orderer?.ordererName || "-"}
                          </td>
                          <td style={tableCellStyle}>
                            {order.orderer?.accountNumber || "-"}
                          </td>
                          <td style={tableCellStyle}>
                            {order.orderer?.ordererEmail || "-"}
                          </td>
                          <td style={tableCellStyle}>{deliveryText || "-"}</td>
                          <td style={tableCellStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background:
                                  order.status === "ny"
                                    ? "#fff3cd"
                                    : order.status === "påbörjad"
                                    ? "#e3f2fd"
                                    : order.status === "klar"
                                    ? "#e8f5e9"
                                    : "#ede7f6",
                                color:
                                  order.status === "ny"
                                    ? "#8a6d3b"
                                    : order.status === "påbörjad"
                                    ? "#0d47a1"
                                    : order.status === "klar"
                                    ? "#1b5e20"
                                    : "#4527a0",
                                fontWeight: "bold",
                                fontSize: 13,
                              }}
                            >
                              {order.status || "ny"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedOrder && (
            <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0 }}>Beställning</h2>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPackingSlipOrder(selectedOrder);
                        setShowPackingSlip(true);
                        setSelectedOrder(null);
                      }}
                      style={primaryButtonStyle}
                    >
                      Visa följesedel
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteOrder(selectedOrder.id)}
                      style={dangerButtonStyle}
                    >
                      Ta bort beställning
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      style={secondaryButtonStyle}
                    >
                      Stäng
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div>
                    <strong>Ordernummer:</strong>{" "}
                    {selectedOrder.orderNumber || selectedOrder.id}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Datum:</strong>{" "}
                    {new Date(selectedOrder.createdAt).toLocaleString("sv-SE")}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label
                      htmlFor="selectedOrderStatus"
                      style={{
                        display: "block",
                        marginBottom: 6,
                        fontWeight: "bold",
                      }}
                    >
                      Status
                    </label>
                    <select
                      id="selectedOrderStatus"
                      value={selectedOrder.status || "ny"}
                      onChange={(e) =>
                        updateOrderStatus(selectedOrder.id, e.target.value)
                      }
                      disabled={isUpdatingOrderStatus}
                      style={{ ...inputStyle, maxWidth: 260 }}
                    >
                      <option value="ny">Ny</option>
                      <option value="påbörjad">Påbörjad</option>
                      <option value="klar">Klar</option>
                      <option value="skickad">Skickad</option>
                    </select>
                    {isUpdatingOrderStatus && (
                      <div style={{ marginTop: 8, color: "#555" }}>
                        Sparar status...
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitleStyle}>Produkter</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {(selectedOrder.cart || []).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 12,
                          padding: 14,
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                          {item.badgeName}
                        </div>
                        <div>
                          <strong>Typ:</strong> {getProductTypeLabel(item.productType)}
                        </div>
                        {renderOrderItemDetails(item)}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitleStyle}>Beställare</div>
                  <div><span style={{ color: "#666" }}>Namn:</span> {selectedOrder.orderer?.ordererName || "-"}</div>
                  <div><span style={{ color: "#666" }}>E-post:</span> {selectedOrder.orderer?.ordererEmail || "-"}</div>
                  <div><span style={{ color: "#666" }}>Mobilnummer:</span> {selectedOrder.orderer?.ordererPhone || "-"}</div>
                  <div><span style={{ color: "#666" }}>Ansvarsnummer:</span> {selectedOrder.orderer?.accountNumber || "-"}</div>
                  <div><span style={{ color: "#666" }}>Beskrivning:</span> {selectedOrder.orderer?.messageToSupplier || "-"}</div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={sectionTitleStyle}>Leveransadress</div>
                  <div><span style={{ color: "#666" }}>Företag:</span> {selectedOrder.delivery?.company || "-"}</div>
                  <div><span style={{ color: "#666" }}>Mottagare:</span> {selectedOrder.delivery?.recipient || "-"}</div>
                  <div><span style={{ color: "#666" }}>Adress:</span> {selectedOrder.delivery?.address || "-"}</div>
                  <div><span style={{ color: "#666" }}>Postnummer:</span> {selectedOrder.delivery?.postalCode || "-"}</div>
                  <div><span style={{ color: "#666" }}>Postort:</span> {selectedOrder.delivery?.city || "-"}</div>
                  <div><span style={{ color: "#666" }}>Land:</span> {selectedOrder.delivery?.country || "-"}</div>
                </div>
              </div>
            </div>
          )}

          <PackingSlipModal
            packingSlipOrder={packingSlipOrder}
            showPackingSlip={showPackingSlip}
            setShowPackingSlip={setShowPackingSlip}
            setPackingSlipOrder={setPackingSlipOrder}
            renderPackingSlipDescription={renderPackingSlipDescription}
            primaryButtonStyle={primaryButtonStyle}
            secondaryButtonStyle={secondaryButtonStyle}
            packingSlipOverlayStyle={packingSlipOverlayStyle}
            packingSlipStyle={packingSlipStyle}
            packingSlipActionsStyle={packingSlipActionsStyle}
            tableHeaderStyle={tableHeaderStyle}
            tableCellStyle={tableCellStyle}
          />
        </div>
        </div>
        </AdminLayout>
      </PageContainer>
    );
  }

  if (step === "cart") {
    return (
      <CartPage
        getHeaderProps={getHeaderProps}
        goBackToLanding={goBackToLanding}
        backButtonStyle={backButtonStyle}
        cart={cart}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        orderer={orderer}
        signedInPurchaser={Boolean(accountUser)}
        setOrderer={setOrderer}
        delivery={delivery}
        setDelivery={setDelivery}
        orderDetails={orderDetails}
        setOrderDetails={setOrderDetails}
        validateOrderDetails={validateOrderDetails}
        setShowOrderSummary={setShowOrderSummary}
        secondaryButtonStyle={secondaryButtonStyle}
        primaryButtonStyle={primaryButtonStyle}
        setStepToLanding={setStepToLanding}
        showOrderSummary={showOrderSummary}
        submitOrderToBackend={submitOrderToBackend}
        modalOverlayStyle={modalOverlayStyle}
        modalContentStyle={modalContentStyle}
        sectionTitleStyle={sectionTitleStyle}
      />
    );
  }

  if (step === "catalog") {
    return (
      <CatalogPage
        key={`catalog-${catalogVersion}`}
        getHeaderProps={getHeaderProps}
        goBackToLanding={goBackToLanding}
        backButtonStyle={backButtonStyle}
        selectedCategory={selectedCategory}
        featuredDirectProductId={featuredDirectProductId}
        openCategory={openCategory}
        secondaryButtonStyle={secondaryButtonStyle}
        primaryButtonStyle={primaryButtonStyle}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        openProduct={openProduct}
        addDirectProductToCart={addDirectProductToCart}
      />
    );
  }

  if (step === "form") {
    return (
      <ProductFormPage
        getHeaderProps={getHeaderProps}
        goBackFromForm={goBackFromForm}
        backButtonStyle={backButtonStyle}
        selectedCategory={selectedCategory}
        openCategory={openCategory}
        selectedBadge={selectedBadge}
        selectedProductType={selectedProductType}
        successMessage={successMessage}
        productForm={productForm}
        setProductForm={setProductForm}
        addCurrentItemToCart={addCurrentItemToCart}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        primaryButtonStyle={primaryButtonStyle}
      />
    );
  }

  return (
    <LandingPage
        key={`landing-${catalogVersion}`}
      toastMessage={toastMessage}
      getHeaderProps={getHeaderProps}
      selectedCategory={selectedCategory}
      openCategory={openCategory}
      openFeaturedProduct={openFeaturedProduct}
      openNameBadges={openNameBadges}
      primaryButtonStyle={primaryButtonStyle}
      secondaryButtonStyle={secondaryButtonStyle}
      cardStyle={cardStyle}
    />
  );
}

const inputStyle = {
  width: "100%",
  maxWidth: 420,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #dddddd",
  marginTop: 6,
  boxSizing: "border-box",
  fontSize: 15,
  background: "white",
};

const primaryButtonStyle = {
  padding: "13px 20px",
  borderRadius: 12,
  border: "none",
  background: "#111111",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const secondaryButtonStyle = {
  padding: "13px 20px",
  borderRadius: 12,
  border: "1px solid #e2e2e2",
  background: "white",
  color: "#111111",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
};

const cardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
};

const dangerButtonStyle = {
  padding: "13px 20px",
  borderRadius: 12,
  border: "none",
  background: "#c62828",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
};

const backButtonStyle = {
  marginBottom: 24,
  background: "white",
  border: "1px solid #e4e4e4",
  borderRadius: 12,
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: 600,
};

const sectionTitleStyle = {
  marginBottom: 20,
  marginTop: 10,
  fontWeight: 700,
  fontSize: 22,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "100px 20px 20px",
  zIndex: 1000,
};

const modalContentStyle = {
  background: "white",
  borderRadius: 22,
  padding: 28,
  width: "100%",
  maxWidth: 980,
  boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
  maxHeight: "85vh",
  overflow: "auto",
};

const packingSlipOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 3000,
};

const packingSlipStyle = {
  background: "white",
  borderRadius: 22,
  padding: 28,
  paddingBottom: 40,
  width: "100%",
  maxWidth: 950,
  boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
  maxHeight: "90vh",
  overflow: "auto",
};

const packingSlipActionsStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const tableHeaderStyle = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: 14,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "14px 12px",
  fontSize: 14,
  lineHeight: 1.45,
};


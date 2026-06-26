"use client";
import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Package, CreditCard, Landmark, Banknote, Lock } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FieldErrors = Record<string, string>;

interface SavedAddress {
  id: string;
  firstName: string; lastName: string; phone?: string | null;
  address1: string; address2?: string | null;
  city: string; state: string; pincode: string; country: string;
  isDefault: boolean;
}

export interface AddressForm {
  firstName: string; lastName: string; phone: string;
  address1: string; address2: string; city: string; state: string; pincode: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants (module-level, never recreated)
// ─────────────────────────────────────────────────────────────────────────────

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export const emptyAddress = (): AddressForm => ({
  firstName: "", lastName: "", phone: "", address1: "", address2: "", city: "", state: "", pincode: "",
});

function addrToForm(a: SavedAddress): AddressForm {
  return {
    firstName: a.firstName, lastName: a.lastName, phone: a.phone || "",
    address1: a.address1, address2: a.address2 || "",
    city: a.city, state: a.state, pincode: a.pincode,
  };
}

function inputCls(err?: string) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm sf-ring transition-colors ${err ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`;
}

function addrOneLine(a: SavedAddress | AddressForm) {
  return `${a.address1}${(a as SavedAddress).address2 || (a as AddressForm).address2 ? ", " + ((a as SavedAddress).address2 || (a as AddressForm).address2) : ""}, ${a.city}, ${a.state} – ${a.pincode}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressFields — OUTSIDE page component (prevents cursor-jump bug)
// ─────────────────────────────────────────────────────────────────────────────

interface AddressFieldsProps {
  prefix: string;
  data: AddressForm;
  onChange: (key: keyof AddressForm, value: string) => void;
  errors: FieldErrors;
  showPhone?: boolean;
}

function AddressFields({ prefix, data, onChange, errors, showPhone = false }: AddressFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
        <input className={inputCls(errors[`${prefix}_firstName`])} value={data.firstName}
          onChange={e => onChange("firstName", e.target.value)} placeholder="Rahul" autoComplete="given-name" />
        {errors[`${prefix}_firstName`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_firstName`]}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
        <input className={inputCls(errors[`${prefix}_lastName`])} value={data.lastName}
          onChange={e => onChange("lastName", e.target.value)} placeholder="Sharma" autoComplete="family-name" />
        {errors[`${prefix}_lastName`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_lastName`]}</p>}
      </div>
      {showPhone && (
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
          <input className={inputCls(errors[`${prefix}_phone`])} value={data.phone}
            onChange={e => onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210" inputMode="numeric" maxLength={10} autoComplete="tel" />
          {errors[`${prefix}_phone`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_phone`]}</p>}
        </div>
      )}
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
        <input className={inputCls(errors[`${prefix}_address1`])} value={data.address1}
          onChange={e => onChange("address1", e.target.value)} placeholder="Flat / House No, Street, Area" autoComplete="address-line1" />
        {errors[`${prefix}_address1`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_address1`]}</p>}
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 2 <span className="text-gray-400 font-normal">(optional)</span></label>
        <input className={inputCls()} value={data.address2}
          onChange={e => onChange("address2", e.target.value)} placeholder="Landmark, Apartment, Tower…" autoComplete="address-line2" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
        <input className={inputCls(errors[`${prefix}_city`])} value={data.city}
          onChange={e => onChange("city", e.target.value)} placeholder="Mumbai" autoComplete="address-level2" />
        {errors[`${prefix}_city`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_city`]}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
        <select className={inputCls(errors[`${prefix}_state`])} value={data.state}
          onChange={e => onChange("state", e.target.value)}>
          <option value="">Select state…</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors[`${prefix}_state`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_state`]}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code <span className="text-red-500">*</span></label>
        <input className={inputCls(errors[`${prefix}_pincode`])} value={data.pincode}
          onChange={e => onChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="400001" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        {errors[`${prefix}_pincode`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${prefix}_pincode`]}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validate(email: string, sh: AddressForm, bl: AddressForm, sameAsBilling: boolean, shippingMethodId: string): FieldErrors {
  const e: FieldErrors = {};
  if (!email.trim()) e.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";

  if (!sh.firstName.trim()) e["sh_firstName"] = "First name is required";
  if (!sh.lastName.trim()) e["sh_lastName"] = "Last name is required";
  if (!sh.phone.trim()) e["sh_phone"] = "Mobile number is required";
  else if (!/^[6-9]\d{9}$/.test(sh.phone)) e["sh_phone"] = "Enter a valid 10-digit Indian mobile number";
  if (!sh.address1.trim()) e["sh_address1"] = "Address is required";
  if (!sh.city.trim()) e["sh_city"] = "City is required";
  if (!sh.state) e["sh_state"] = "Please select a state";
  if (!sh.pincode.trim()) e["sh_pincode"] = "PIN code is required";
  else if (!/^\d{6}$/.test(sh.pincode)) e["sh_pincode"] = "Enter a valid 6-digit PIN code";

  if (!sameAsBilling) {
    if (!bl.firstName.trim()) e["bl_firstName"] = "First name is required";
    if (!bl.lastName.trim()) e["bl_lastName"] = "Last name is required";
    if (!bl.address1.trim()) e["bl_address1"] = "Address is required";
    if (!bl.city.trim()) e["bl_city"] = "City is required";
    if (!bl.state) e["bl_state"] = "Please select a state";
    if (!bl.pincode.trim()) e["bl_pincode"] = "PIN code is required";
    else if (!/^\d{6}$/.test(bl.pincode)) e["bl_pincode"] = "Enter a valid 6-digit PIN code";
  }

  if (!shippingMethodId) e.shippingMethod = "Please select a shipping method";
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressCard — shows one saved address as a selectable card
// ─────────────────────────────────────────────────────────────────────────────

function AddressCard({
  addr, selected, onSelect, onDelete, onSetDefault,
}: {
  addr: SavedAddress;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected ? "sf-border-active sf-chip" : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "" : "border-gray-300"}`}
        style={selected ? { borderColor: "var(--sf-brand)", backgroundColor: "var(--sf-brand)" } : {}}
      >
        {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
      </div>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">{addr.firstName} {addr.lastName}</p>
          {addr.isDefault && (
            <span className="text-xs sf-chip border px-2 py-0.5 rounded-full font-medium">Default</span>
          )}
        </div>
        {addr.phone && <p className="text-xs text-gray-500 mb-1">{addr.phone}</p>}
        <p className="text-xs text-gray-600 leading-relaxed">{addrOneLine(addr)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
        {!addr.isDefault && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSetDefault(); }}
            className="text-xs sf-text font-medium hover:opacity-70"
          >
            Set as default
          </button>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cart, setCart] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null); // "new" or address id
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [email, setEmail] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shipping, setShipping] = useState<AddressForm>(emptyAddress());
  const [billing, setBilling] = useState<AddressForm>(emptyAddress());
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentGatewayId, setPaymentGatewayId] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [autoDiscounts, setAutoDiscounts] = useState<Array<{ id: string; title: string; type: string; value: number; minAmount: number | null }>>([]);

  // Stable handlers — prevent cursor-jump bug
  const onShippingChange = useCallback((key: keyof AddressForm, value: string) => {
    setShipping(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`sh_${key}`]; return n; });
  }, []);

  const onBillingChange = useCallback((key: keyof AddressForm, value: string) => {
    setBilling(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`bl_${key}`]; return n; });
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────

  const init = useCallback(async () => {
    const infoRes = await fetch(`/api/storefront/storeinfo?slug=${slug}`);
    if (!infoRes.ok) { setLoading(false); return; }
    const { store: s } = await infoRes.json();
    setStore(s);
    if (s.shippingMethods?.[0]) setShippingMethodId(s.shippingMethods[0].id);
    // Pre-select the first active payment gateway
    if (s.paymentGateways?.length) {
      const defaultGw = s.paymentGateways.find((g: { provider: string }) => g.provider === "COD") || s.paymentGateways[0];
      setPaymentMethod(defaultGw.provider);
      setPaymentGatewayId(defaultGw.id);
    }

    const [cartRes, meRes, discRes] = await Promise.all([
      fetch(`/api/storefront/cart?storeId=${s.id}`),
      fetch(`/api/storefront/customer/me?storeId=${s.id}`),
      fetch(`/api/storefront/checkout?storeId=${s.id}`),
    ]);
    if (discRes.ok) {
      const { discounts } = await discRes.json();
      setAutoDiscounts(discounts || []);
    }
    const { cart: c } = await cartRes.json();
    setCart(c);

    if (meRes.ok) {
      const { customer } = await meRes.json();
      if (customer) {
        setLoggedInCustomer(customer);
        setEmail(customer.email);

        // Load saved addresses
        const addrRes = await fetch(`/api/storefront/customer/addresses?storeId=${s.id}`);
        if (addrRes.ok) {
          const { addresses } = await addrRes.json();
          setSavedAddresses(addresses || []);
          if (addresses?.length) {
            // Pre-select the default address
            const def = addresses.find((a: SavedAddress) => a.isDefault) || addresses[0];
            setSelectedAddressId(def.id);
            setShipping(addrToForm(def));
          } else {
            // No saved addresses — show new form
            setShowNewAddressForm(true);
          }
        }
      }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { init(); }, [init]);

  // ── Address selection ─────────────────────────────────────────────────────

  function selectAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setShipping(addrToForm(addr));
    setShowNewAddressForm(false);
    setFieldErrors({});
  }

  function pickNewAddress() {
    setSelectedAddressId("new");
    setShipping(emptyAddress());
    setShowNewAddressForm(true);
    setFieldErrors({});
  }

  async function deleteAddress(addrId: string) {
    if (!store) return;
    if (!confirm("Remove this address?")) return;
    await fetch(`/api/storefront/customer/addresses/${addrId}?storeId=${store.id}`, { method: "DELETE" });
    const next = savedAddresses.filter(a => a.id !== addrId);
    setSavedAddresses(next);
    if (selectedAddressId === addrId) {
      if (next.length) {
        selectAddress(next[0]);
      } else {
        setSelectedAddressId("new");
        setShipping(emptyAddress());
        setShowNewAddressForm(true);
      }
    }
  }

  async function setDefaultAddress(addrId: string) {
    if (!store) return;
    await fetch(`/api/storefront/customer/addresses/${addrId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, isDefault: true }),
    });
    setSavedAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addrId })));
  }

  // ── Coupon ────────────────────────────────────────────────────────────────

  async function applyCoupon() {
    if (!coupon || !store) return;
    const r = await fetch("/api/storefront/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "applyCoupon", storeId: store.id, code: coupon, orderAmount: subtotal }),
    });
    const d = await r.json();
    if (r.ok) { setCouponDiscount(d.discount || 0); setCouponMsg(`✓ Saved ${formatCurrency(d.discount, store.currency)}`); }
    else { setCouponMsg(d.error || "Invalid coupon"); setCouponDiscount(0); }
  }

  // ── Place order ───────────────────────────────────────────────────────────

  async function placeOrder() {
    if (!store || !cart?.items?.length) return;

    const errs = validate(email, shipping, billing, sameAsBilling, shippingMethodId);
    if (createAccount && !loggedInCustomer) {
      if (!accountPassword) errs.accountPassword = "Password is required";
      else if (accountPassword.length < 6) errs.accountPassword = "Minimum 6 characters";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => document.getElementById("checkout-top")?.scrollIntoView({ behavior: "smooth" }), 100);
      return;
    }

    setPlacing(true);
    try {
      let customerId = loggedInCustomer?.id;

      // Register account if requested
      if (createAccount && !loggedInCustomer) {
        const regRes = await fetch("/api/storefront/customer/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: store.id, email, password: accountPassword, firstName: shipping.firstName, lastName: shipping.lastName, phone: shipping.phone }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) { setFieldErrors({ email: regData.error }); setPlacing(false); return; }
        customerId = regData.customer.id;
      }

      // Save address: logged-in customer adding new address, OR new account just created
      const isNewlyRegistered = createAccount && !loggedInCustomer && !!customerId;
      if (saveNewAddress && (isNewlyRegistered || (loggedInCustomer && showNewAddressForm))) {
        setSavingAddr(true);
        await fetch("/api/storefront/customer/addresses", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: store.id, ...shipping, isDefault: true }),
        });
        setSavingAddr(false);
      }

      const shippingAddress = { ...shipping, country: "India" };
      const billingAddress = sameAsBilling ? { ...shippingAddress } : { ...billing, country: "India" };

      // ── Step 1: Create DB order (PENDING_PAYMENT) ──────────────────────────
      const r = await fetch("/api/storefront/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id, email, phone: shipping.phone,
          shippingAddress, billingAddress,
          shippingMethodId,
          paymentGatewayId: paymentGatewayId || undefined,
          couponCode: coupon || undefined,
          customerId,
        }),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Checkout failed"); setPlacing(false); return; }

      const order = d.order;

      // ── COD: done — go to success page ────────────────────────────────────
      if (paymentMethod === "COD") {
        router.push(`/store/${slug}/order-success?order=${order?.orderNumber}&storeId=${store.id}`);
        return;
      }

      // ── Step 2: Create gateway payment order (server-side) ─────────────────
      const gwRes = await fetch("/api/storefront/payment/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, orderId: order.id, provider: paymentMethod }),
      });
      const gwData = await gwRes.json();
      if (!gwRes.ok) { alert(gwData.error || "Payment gateway error"); setPlacing(false); return; }

      // ── RAZORPAY: open modal ───────────────────────────────────────────────
      if (paymentMethod === "RAZORPAY") {
        // Load Razorpay SDK dynamically
        await loadScript("https://checkout.razorpay.com/v1/checkout.js");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) { alert("Razorpay SDK failed to load. Please try again."); setPlacing(false); return; }

        const rzp = new Razorpay({
          key: gwData.keyId,
          amount: gwData.amount,          // in paise (from server)
          currency: gwData.currency,
          name: store.name,
          description: `Order #${order.orderNumber}`,
          order_id: gwData.razorpayOrderId,
          prefill: {
            name: `${shipping.firstName} ${shipping.lastName}`,
            email,
            contact: shipping.phone,
          },
          theme: { color: store.primaryColor || "#22c55e" },
          modal: {
            ondismiss: () => { setPlacing(false); },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            // ── Step 3: Verify payment ───────────────────────────────────────
            const vRes = await fetch("/api/storefront/payment/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storeId: store.id,
                orderId: order.id,
                provider: "RAZORPAY",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (vRes.ok && vData.success) {
              router.push(`/store/${slug}/order-success?order=${order.orderNumber}&storeId=${store.id}`);
            } else {
              alert(vData.error || "Payment verification failed. Please contact support.");
              setPlacing(false);
            }
          },
        });
        rzp.open();
        return; // setPlacing(false) happens inside modal callbacks
      }

      // ── CASHFREE: redirect to payment page ────────────────────────────────
      if (paymentMethod === "CASHFREE") {
        await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const CashfreeSDK = (window as any).Cashfree;
        if (!CashfreeSDK) { alert("Cashfree SDK failed to load. Please try again."); setPlacing(false); return; }

        const cashfree = CashfreeSDK({ mode: gwData.mode || "sandbox" });
        cashfree.checkout({ paymentSessionId: gwData.paymentSessionId });
        // Cashfree redirects browser to their payment page, then back to payment-callback
        // setPlacing stays true during redirect
        return;
      }

      setPlacing(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
      setPlacing(false);
    }
  }

  // Helper: load an external script once and resolve when ready
  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  type CheckoutCartItem = { quantity: number; variant: { price: number; product?: { gstRate?: number; gstIncluded?: boolean } } };
  const subtotal = cart?.items?.reduce((s: number, i: CheckoutCartItem) => s + i.quantity * i.variant.price, 0) || 0;
  const selectedShipping = store?.shippingMethods?.find((m: { id: string }) => m.id === shippingMethodId);
  const autoFreeShipping = !coupon && autoDiscounts.some(d => d.type === "FREE_SHIPPING" && (!d.minAmount || subtotal >= d.minAmount));
  const shippingCost = autoFreeShipping ? 0 : (selectedShipping?.price ?? 60);
  // GST is included in product prices — extract it for display only, don't add to total
  const taxAmount = cart?.items?.reduce((s: number, i: CheckoutCartItem) => {
    const rate = i.variant.product?.gstRate ?? 18;
    const included = i.variant.product?.gstIncluded ?? true;
    const linePrice = i.variant.price * i.quantity;
    return s + (included ? linePrice * rate / (100 + rate) : linePrice * rate / 100);
  }, 0) || 0;
  const applicableAutoDiscounts = coupon ? [] : autoDiscounts.filter(d =>
    (!d.minAmount || subtotal >= d.minAmount)
  );
  const autoDiscountTotal = applicableAutoDiscounts.reduce((sum, d) => {
    if (d.type === "PERCENTAGE") return sum + (subtotal * d.value) / 100;
    if (d.type === "FLAT") return sum + d.value;
    return sum;
  }, 0);
  const total = subtotal + shippingCost - couponDiscount - autoDiscountTotal;

  // ── Loaders ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading checkout…</span>
      </div>
    </div>
  );

  if (!store) return <div className="min-h-screen flex items-center justify-center text-red-500">Store not found</div>;
  if (!cart?.items?.length) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <div className="flex justify-center text-gray-300"><ShoppingCart className="w-12 h-12" /></div>
      <p className="text-gray-600 text-lg font-medium">Your cart is empty</p>
      <Link href={`/store/${slug}`} className="sf-btn px-6 py-3 rounded-xl font-semibold">Continue Shopping</Link>
    </div>
  );

  const isLoggedIn = !!loggedInCustomer;
  const hasSavedAddresses = savedAddresses.length > 0;

  return (
    <div className="min-h-screen bg-gray-50" id="checkout-top">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center text-xl font-bold text-gray-900">
            {store?.logo ? (
              <img src={store.logo} alt={store.name} className="h-12 w-auto max-w-[160px] rounded-lg object-contain" />
            ) : (
              <span>{store.name}</span>
            )}
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href={`/store/${slug}/cart`} className="text-gray-500 hover:text-gray-700">Cart</Link>
            <span>›</span>
            <span className="text-gray-900 font-semibold">Checkout</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-8">
        {/* ── LEFT ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 text-lg">Contact Information</h2>
            {isLoggedIn ? (
              <div className="flex items-center justify-between sf-chip border rounded-xl px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{loggedInCustomer.firstName} {loggedInCustomer.lastName}</p>
                  <p className="text-xs opacity-80">{loggedInCustomer.email}</p>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/storefront/customer/login?storeId=${store.id}`, { method: "DELETE" });
                    setLoggedInCustomer(null); setEmail(""); setSavedAddresses([]); setSelectedAddressId(null); setShipping(emptyAddress()); setShowNewAddressForm(false);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >Sign out</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" className={inputCls(fieldErrors.email)} value={email}
                    onChange={e => { setEmail(e.target.value); setFieldErrors(p => { const n = { ...p }; delete n.email; return n; }); }}
                    placeholder="you@example.com" autoComplete="email" />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="createAcc" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} className="w-4 h-4 rounded sf-accent border-gray-300" />
                  <label htmlFor="createAcc" className="text-sm text-gray-600 cursor-pointer">Save details — create an account to track orders</label>
                </div>
                {createAccount && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Password <span className="text-red-500">*</span></label>
                    <input type="password" className={inputCls(fieldErrors.accountPassword)} value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)} placeholder="Minimum 6 characters" />
                    {fieldErrors.accountPassword && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.accountPassword}</p>}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Already have an account?{" "}
                  <Link href={`/store/${slug}/account`} className="sf-text hover:underline font-medium">Sign in →</Link>
                </p>
              </div>
            )}
          </div>

          {/* ── Shipping Address ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 text-lg">Shipping Address</h2>

            {/* Saved address picker (logged-in only) */}
            {isLoggedIn && hasSavedAddresses && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Saved Addresses</p>
                <div className="space-y-3">
                  {savedAddresses.map(addr => (
                    <AddressCard
                      key={addr.id}
                      addr={addr}
                      selected={selectedAddressId === addr.id}
                      onSelect={() => selectAddress(addr)}
                      onDelete={() => deleteAddress(addr.id)}
                      onSetDefault={() => setDefaultAddress(addr.id)}
                    />
                  ))}

                  {/* Add new address option */}
                  <button
                    type="button"
                    onClick={pickNewAddress}
                    className={`w-full p-4 rounded-xl border-2 border-dashed text-sm font-semibold transition-all flex items-center gap-2 ${
                      selectedAddressId === "new"
                        ? "sf-border-active sf-chip"
                        : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                    }`}
                  >
                    <span className="text-lg">+</span> Add a new address
                  </button>
                </div>
              </div>
            )}

            {/* New address form */}
            {(showNewAddressForm || !isLoggedIn) && (
              <div>
                {isLoggedIn && hasSavedAddresses && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Address Details</p>
                )}
                <AddressFields prefix="sh" data={shipping} onChange={onShippingChange} errors={fieldErrors} showPhone />

                {/* Save address toggle (for logged-in customers entering new address) */}
                {isLoggedIn && (
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input type="checkbox" checked={saveNewAddress} onChange={e => setSaveNewAddress(e.target.checked)}
                      className="w-4 h-4 rounded sf-accent border-gray-300" />
                    <span className="text-sm text-gray-600">Save this address to my account</span>
                  </label>
                )}
              </div>
            )}

            {/* Summary of selected saved address (when form is hidden) */}
            {isLoggedIn && !showNewAddressForm && selectedAddressId && selectedAddressId !== "new" && (
              <div className="text-xs text-gray-400 mt-2 pl-1">
                Address selected above will be used for delivery
              </div>
            )}
          </div>

          {/* Billing Address */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-3 text-lg">Billing Address</h2>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={sameAsBilling} onChange={e => setSameAsBilling(e.target.checked)} className="w-4 h-4 rounded sf-accent border-gray-300" />
              <span className="text-sm text-gray-600">Same as shipping address</span>
            </label>
            {!sameAsBilling && (
              <AddressFields prefix="bl" data={billing} onChange={onBillingChange} errors={fieldErrors} />
            )}
          </div>

          {/* Shipping Method */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 text-lg">Shipping Method</h2>
            {fieldErrors.shippingMethod && <p className="text-sm text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">{fieldErrors.shippingMethod}</p>}
            <div className="space-y-2">
              {store.shippingMethods?.map((m: { id: string; name: string; price: number; minDays: number; maxDays: number }) => (
                <label key={m.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${shippingMethodId === m.id ? "sf-border-active sf-chip" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" value={m.id} checked={shippingMethodId === m.id} onChange={() => setShippingMethodId(m.id)} className="sf-accent" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.minDays === 0 ? "Today" : `${m.minDays}–${m.maxDays} business days`}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{m.price === 0 ? <span className="sf-text">FREE</span> : formatCurrency(m.price, store.currency)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 text-lg">Payment Method</h2>
            <div className="space-y-2">
              {store.paymentGateways?.map((g: { id: string; provider: string; name: string }) => (
                <label key={g.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === g.provider ? "sf-border-active sf-chip" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="payment" value={g.provider} checked={paymentMethod === g.provider}
                    onChange={() => { setPaymentMethod(g.provider); setPaymentGatewayId(g.id); }}
                    className="sf-accent" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      {g.provider === "RAZORPAY" && <CreditCard className="w-5 h-5" />}
                      {g.provider === "CASHFREE" && <Landmark className="w-5 h-5" />}
                      {g.provider === "COD" && <Banknote className="w-5 h-5" />}
                      {g.name}
                    </p>
                    {g.provider === "COD" && <p className="text-xs text-gray-500">Pay at doorstep — no online payment needed</p>}
                    {g.provider === "RAZORPAY" && <p className="text-xs text-gray-500">UPI · Cards · Net Banking · Wallets · EMI</p>}
                    {g.provider === "CASHFREE" && <p className="text-xs text-gray-500">UPI · Cards · Net Banking · EMI</p>}
                  </div>
                  {paymentMethod === g.provider && (
                    <span className="sf-chip border text-xs font-semibold px-2 py-0.5 rounded-full">Selected</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Summary ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
              {cart?.items?.map((item: { id: string; quantity: number; variant: { price: number; compareAtPrice?: number | null; title: string; imageUrl?: string | null; product: { title: string; images?: { url: string }[] } } }) => {
                const imgUrl = item.variant.imageUrl || item.variant.product.images?.[0]?.url || null;
                return (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 overflow-hidden flex items-center justify-center text-lg">
                    {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs leading-tight truncate">{item.variant.product?.title}</p>
                    {item.variant.title !== "Default" && <p className="text-xs text-gray-400">{item.variant.title}</p>}
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{formatCurrency(item.variant.price * item.quantity, store.currency)}</p>
                    {item.variant.compareAtPrice && item.variant.compareAtPrice > item.variant.price && (
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(item.variant.compareAtPrice * item.quantity, store.currency)}</p>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm sf-ring uppercase tracking-wider"
                  placeholder="COUPON CODE" value={coupon}
                  onChange={e => setCoupon(e.target.value.toUpperCase())}
                />
                <button onClick={applyCoupon} type="button" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 font-medium">Apply</button>
              </div>
              {couponMsg && <p className={`text-xs mt-1.5 ${couponDiscount > 0 ? "sf-text font-medium" : "text-red-500"}`}>{couponMsg}</p>}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Base Price (excl. GST)</span>
                <span>{formatCurrency(Math.round((subtotal - taxAmount) * 100) / 100, store.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  GST
                  <span className="text-xs sf-chip border px-1.5 py-0.5 rounded-full font-medium">Incl. in price</span>
                </span>
                <span>{formatCurrency(Math.round(taxAmount * 100) / 100, store.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-700 font-medium">
                <span>Subtotal (incl. GST)</span><span>{formatCurrency(subtotal, store.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? <span className="sf-text font-medium">FREE</span> : formatCurrency(shippingCost, store.currency)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between sf-text font-medium"><span>Coupon Discount</span><span>−{formatCurrency(couponDiscount, store.currency)}</span></div>
              )}
              {applicableAutoDiscounts.map(d => {
                const amt = d.type === "PERCENTAGE" ? (subtotal * d.value) / 100 : d.type === "FLAT" ? d.value : 0;
                if (amt <= 0 && d.type !== "FREE_SHIPPING") return null;
                return (
                  <div key={d.id} className="flex justify-between sf-text font-medium text-sm">
                    <span>{d.title}</span>
                    <span>{d.type === "FREE_SHIPPING" ? "Free Shipping" : `−${formatCurrency(amt, store.currency)}`}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-3 border-t border-gray-200">
                <span>Total</span><span>{formatCurrency(total, store.currency)}</span>
              </div>
              <p className="text-xs text-gray-400 text-center pt-1">All prices include GST. No additional tax is charged.</p>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing || savingAddr}
              className="w-full mt-5 sf-btn py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-colors shadow-md"
            >
              {placing || savingAddr ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {savingAddr ? "Saving address…" : "Placing Order…"}
                </span>
              ) : paymentMethod === "RAZORPAY"
              ? `Pay with Razorpay · ${formatCurrency(total, store.currency)}`
              : paymentMethod === "CASHFREE"
              ? `Pay with Cashfree · ${formatCurrency(total, store.currency)}`
              : `Place Order · ${formatCurrency(total, store.currency)}`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Secure · Encrypted · GST Compliant</p>
          </div>
        </div>
      </div>
    </div>
  );
}

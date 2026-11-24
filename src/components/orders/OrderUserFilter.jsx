import {getOrderOwner,orderBelongsToUser} from "../../data/orderOwnership";
export {getOrderOwner};
export function orderMatchesUser(order, filter, userId, userEmail) {
  return filter === "all" || (filter === "mine" ? orderBelongsToUser(order,{id:userId,email:userEmail}) : getOrderOwner(order).id === filter);
}
export function getOrderUserOptions(orders) {
  const users = new Map();
  orders.forEach(order => { const owner = getOrderOwner(order); if (!users.has(owner.id)) users.set(owner.id, owner); });
  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}
export default function OrderUserFilter({ orders, userId, value, onChange }) {
  return <label style={{ display: "grid", gap: 5, minWidth: 170, fontSize: 11, color: "#77716a" }}>Beställare
    <select aria-label="Filtrera på beställare" value={value} onChange={event => onChange(event.target.value)} style={{ minHeight: 38, minWidth: 0, maxWidth: "100%", padding: "8px 10px", border: "1px solid #e5e1db", borderRadius: 6, background: "#fff", color: "#353535", font: "inherit" }}>
      <option value="all">Alla beställare</option>{userId && <option value="mine">Mina beställningar</option>}
      {getOrderUserOptions(orders).map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
    </select>
  </label>;
}

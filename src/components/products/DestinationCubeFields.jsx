import Field from "../forms/Field";
import { getDestinationCube } from "../../data/destinationCube";

export default function DestinationCubeFields({ form, product, onChange, inputStyle }) {
  const cube = getDestinationCube(form, product);
  return <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
    <Field label="Målpunkt" htmlFor="destinationCubeTarget">
      <input id="destinationCubeTarget" type="text" required maxLength={4} value={cube.target}
        style={inputStyle} autoComplete="off" onChange={event => onChange({ destinationCube: { ...cube, target: event.target.value } })} />
    </Field>
    <Field label="Plan" htmlFor="destinationCubeFloor">
      <input id="destinationCubeFloor" type="text" required maxLength={8} value={cube.floor}
        style={inputStyle} autoComplete="off" onChange={event => onChange({ destinationCube: { ...cube, floor: event.target.value } })} />
    </Field>
  </div>;
}

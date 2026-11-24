export default function ParkingPoleFields({form,onChange}){
 return <label>Stolphöjd (mm)<input type="number" min="100" max="6000" step="any" value={form.poleHeightMm??3150} onChange={event=>onChange(event.target.value)}/></label>;
}

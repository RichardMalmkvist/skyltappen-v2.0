import ParkingPoleFields from '../components/products/ParkingPoleFields';
import ParkingSymbolFields from '../components/products/ParkingSymbolFields';
import OptionSwitch from '../components/forms/OptionSwitch';
import StudioDoorFields from '../components/products/StudioDoorFields';
import BraLivBadgeField from '../components/products/BraLivBadgeField';
import {isBraLivBadge} from './braLivNameBadges';
import QuantityInput from "../components/forms/QuantityInput";
import {HANGING_TARGET_KEYS,hangingTargetFields} from "./hangingTargetLayout";
import HangingSymbolFields from "../components/products/HangingSymbolFields";
import {getSalesUnit} from "./salesUnits";
import DestinationCubeFields from "../components/products/DestinationCubeFields";
import { isDoubleLineHangingSign, getHangingBackForm, BACK_SELECTION_KEYS } from "./hangingSignBackText";
import AreaDimensionsFields from "../components/products/AreaDimensionsFields";
import DibondFields from "../components/products/DibondFields";
import { getDoorSignExamples } from "./doorSignExamples";
import { isPersonalDoorSign } from "./doorSignDimensions";
import { getDoorSignSymbols, getDoorSignSymbolById } from "./doorSignSymbols";
import { getBadgeFieldConfig, getBadgeFieldLabel, hasBadgeField } from "./productHelpers";
import "./hangingSignArrows";

function toNumberOrFallback(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDefaultPlaceholder(fieldKey, label) {
  if (fieldKey === "name") return "Anna Svensson";
  if (fieldKey === "customText") return "Skriv text här";
  if (fieldKey === "customTextLine1") return "Skriv första raden här";
  if (fieldKey === "customTextLine2") return "Skriv andra raden här";
  return label;
}

function getArrowDirectionOptions(productForm) {
  const placement = productForm?.arrowPlacement || "none";

  if (placement === "left") {
    return [
      { value: "up", label: "Upp" },
      { value: "left", label: "Vänster" },
      { value: "down", label: "Ner" },
    ];
  }

  if (placement === "right") {
    return [
      { value: "up", label: "Upp" },
      { value: "right", label: "Höger" },
      { value: "down", label: "Ner" },
    ];
  }

  return [];
}

function createTextFieldRenderer(fieldKey) {
  return function renderTextField({
    Field,
    selectedBadge,
    productForm,
    updateFormValue,
    inputStyle,
    symbolCredential,
  }) {
    if(selectedBadge?.productType==='pendlad_skylt'&&productForm.hangingSignWithoutText&&['customText','customTextLine1','customTextLine2'].includes(fieldKey))return null;
    if (fieldKey === "name" && String(selectedBadge?.articleNumber) === "0613") return <Field label="Namn" htmlFor="name"><textarea id="name" rows={2} placeholder="Anna Andersson" style={inputStyle} value={productForm.name || ""} onChange={event=>updateFormValue("name",event.target.value.split(/\r?\n/).slice(0,2).join("\n"))}/></Field>;
    const fallbackLabelMap = {
      name: "Namn",
      title: "Titel",
      titleLine2: "Titel rad 2",
      orgLine1: "Verksamhetsnamn",
      orgLine2: "Verksamhetsnamn rad 2",
      customText: "Text",
      customTextLine1: "Textrad 1",
      customTextLine2: "Textrad 2",
      doorHeading: "Rubrik",
      doorName: "Namn",
      doorTitle: "Titel",
      doorExtra: "Extra text",
    };

    const fallbackLabel = fallbackLabelMap[fieldKey] || fieldKey;
    const baseLabel = getBadgeFieldLabel(selectedBadge, fieldKey, fallbackLabel);
    const label = fieldKey==="quantity"&&getSalesUnit(selectedBadge)!=="st"?`${baseLabel} (${getSalesUnit(selectedBadge)})`:baseLabel;
    const fieldConfig = getBadgeFieldConfig(selectedBadge, fieldKey);
    const placeholder =
      fieldConfig && typeof fieldConfig === "object" && fieldConfig.placeholder
        ? fieldConfig.placeholder
        : getDefaultPlaceholder(fieldKey, label);
    if(isBraLivBadge(selectedBadge) && ["title","titleLine2","orgLine1","orgLine2"].includes(fieldKey))return <BraLivBadgeField key={selectedBadge.id+fieldKey} {...{fieldKey,Field,selectedBadge,productForm,updateFormValue,inputStyle,label}}/>;
    const maxLength =
      fieldConfig && typeof fieldConfig === "object" && Number(fieldConfig.maxLength) > 0
        ? Number(fieldConfig.maxLength)
        : undefined;

    if (selectedBadge?.previewType === "parking_sign") {
      if (fieldKey === "customTextLine2") return null;
      if (fieldKey === "customTextLine1") return (
        String(selectedBadge.articleNumber)==="1501"?<ParkingSymbolFields key="parkingText" product={selectedBadge} form={productForm} credential={symbolCredential} onChange={updateFormValue}/>:(<Field label="Text" htmlFor="customTextLine1">
          <textarea id="customTextLine1" rows={2}
            style={{...inputStyle,width:"100%",boxSizing:"border-box",resize:"vertical",minHeight:88}}
            value={[productForm.customTextLine1 || "", ...(productForm.parkingUseLine2 || productForm.customTextLine2 ? [productForm.customTextLine2 || ""] : [])].join("\n")}
            onKeyDown={event=>{if(event.key==="Enter" && event.currentTarget.value.includes("\n"))event.preventDefault();}}
            onChange={event=>{
              const lines=event.target.value.replace(/\r\n?/g,"\n").split("\n").slice(0,2).map(line=>line.slice(0,maxLength||80));
              updateFormValue("customTextLine1",lines[0]);
              updateFormValue("customTextLine2",lines[1] || "");
              updateFormValue("parkingUseLine2",lines.length>1);
            }}/>
        </Field>)
      );
    }

    // Keep the existing two-line order/production fields behind one text control.
    if (fieldKey === "customText" && selectedBadge?.doorSignTextConfig?.layoutMode === "tactile") {
      return (
        <Field key="tactileDoorText" label={label} htmlFor="customText">
          <textarea
            id="customText"
            rows={2}
            placeholder={placeholder}
            style={{...inputStyle,resize:"vertical"}}
            value={[productForm.customText || "", ...(productForm.doorUseLine2 ? [productForm.customTextLine2 || ""] : [])].join("\n")}
            onChange={event=>{
              const lines=event.target.value.replace(/\r\n?/g,"\n").split("\n").slice(0,2)
                .map(line=>maxLength?line.slice(0,maxLength):line);
              updateFormValue("customText",lines[0]);
              updateFormValue("customTextLine2",lines[1] || "");
              updateFormValue("doorUseLine2",lines.length>1);
            }}
          />
        </Field>
      );
    }

    return (
      <Field key={fieldKey} label={label} htmlFor={fieldKey}>
        <input
          id={fieldKey}
          type="text"
          placeholder={placeholder}
          maxLength={maxLength}
          style={inputStyle}
          value={productForm[fieldKey] || ""}
          onChange={(e) => updateFormValue(fieldKey, e.target.value)}
        />
      </Field>
    );
  };
}

function renderArrowPlacementField({
  Field,
  selectedBadge,
  productForm,
  updateFormValue,
  inputStyle,
}) {
  const fieldKey = "arrowPlacement";
  const label = getBadgeFieldLabel(selectedBadge, fieldKey, "Pilplacering");
  const fieldConfig = selectedBadge?.fields?.[fieldKey];

  const options =
    fieldConfig &&
    typeof fieldConfig === "object" &&
    Array.isArray(fieldConfig.options)
      ? fieldConfig.options
      : [
          { value: "none", label: "Ingen pil" },
          { value: "left", label: "Vänster sida" },
          { value: "right", label: "Höger sida" },
        ];

  return (
    <Field key={fieldKey} label={label} htmlFor={fieldKey}>
      <select
        id={fieldKey}
        style={inputStyle}
        value={productForm.arrowPlacement || "none"}
        onChange={(e) => {
          const nextPlacement = e.target.value;
          const validDirections = getArrowDirectionOptions({
            ...productForm,
            arrowPlacement: nextPlacement,
          }).map((option) => option.value);

          const currentDirection = productForm.arrowDirection || "";
          const nextDirection = validDirections.includes(currentDirection)
            ? currentDirection
            : "";

          updateFormValue(fieldKey, nextPlacement);
          updateFormValue("arrowDirection", nextDirection);

          // The simplified hanging-sign UI uses one placement dropdown + one
          // direction dropdown. Keep the legacy side fields in sync because
          // the preview/order helpers still read them.
          if (nextPlacement === "left") {
            updateFormValue("leftArrowDirection", nextDirection || "none");
            updateFormValue("rightArrowDirection", "none");
          } else if (nextPlacement === "right") {
            updateFormValue("leftArrowDirection", "none");
            updateFormValue("rightArrowDirection", nextDirection || "none");
          } else {
            updateFormValue("leftArrowDirection", "none");
            updateFormValue("rightArrowDirection", "none");
          }
        }}
      >
        {options.map((option) => {
          const optionValue = typeof option === "object" ? option.value : option;
          const optionLabel = typeof option === "object" ? option.label : option;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

function renderArrowDirectionField({
  Field,
  selectedBadge,
  productForm,
  updateFormValue,
  inputStyle,
}) {
  const placement = productForm?.arrowPlacement || "none";

  if (placement === "none") {
    return null;
  }

  const fieldKey = "arrowDirection";
  const label = getBadgeFieldLabel(selectedBadge, fieldKey, "Pilriktning");
  const options = getArrowDirectionOptions(productForm);

  return (
    <Field key={fieldKey} label={label} htmlFor={fieldKey}>
      <select
        id={fieldKey}
        style={inputStyle}
        value={productForm.arrowDirection || ""}
        onChange={(e) => {
          const nextDirection = e.target.value;
          updateFormValue(fieldKey, nextDirection);

          if (placement === "left") {
            updateFormValue("leftArrowDirection", nextDirection || "none");
            updateFormValue("rightArrowDirection", "none");
          } else if (placement === "right") {
            updateFormValue("leftArrowDirection", "none");
            updateFormValue("rightArrowDirection", nextDirection || "none");
          }
        }}
      >
        <option value="">Välj...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}







function renderHangingSignSymbolField(context) {
  return <HangingSymbolFields key="hangingSignSymbols" {...context}/>;
}

function renderFasteningField({
  Field,
  selectedBadge,
  productForm,
  updateFormValue,
  inputStyle,
}) {
  const fieldKey = "fastening";
  const label = getBadgeFieldLabel(selectedBadge, fieldKey, "Fäste");

  return (
    <Field key={fieldKey} label={label} htmlFor={fieldKey}>
      <select
        id={fieldKey}
        style={inputStyle}
        value={productForm.fastening || ""}
        onChange={(e) => updateFormValue(fieldKey, e.target.value)}
      >
        <option value="">Välj...</option>
        {(selectedBadge?.fasteningOptions || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function createNumberFieldRenderer(fieldKey, config = {}) {
  const {
    fallbackLabel = fieldKey,
    min = 0,
    fallbackValue = 0,
  } = config;

  return function renderNumberField({
    Field,
    selectedBadge,
    productForm,
    updateFormValue,
    inputStyle,
  }) {
    const baseLabel = getBadgeFieldLabel(selectedBadge, fieldKey, fallbackLabel);
    const label = fieldKey==="quantity"&&getSalesUnit(selectedBadge)!=="st"?`${baseLabel} (${getSalesUnit(selectedBadge)})`:baseLabel;

    return (
      <Field key={fieldKey} label={label} htmlFor={fieldKey}>
        <QuantityInput id={fieldKey} min={min} value={productForm[fieldKey]??fallbackValue} onChange={value=>updateFormValue(fieldKey,toNumberOrFallback(value,fallbackValue))} style={inputStyle}/>
      </Field>
    );
  };
}

function renderDoorHeadingField({ Field, selectedBadge, productForm, updateFormValue, inputStyle, compactDoorFields }) {
  const isPersonalDoor = isPersonalDoorSign(selectedBadge);
  if (!isPersonalDoor) return createTextFieldRenderer("doorHeading")({ Field, selectedBadge, productForm, updateFormValue, inputStyle });

  if(compactDoorFields||String(selectedBadge.articleNumber)==='0616')return <StudioDoorFields key="doorHeading" {...{Field,selectedBadge,productForm,updateFormValue,inputStyle}}/>;

  const choiceButton = (key, label, clearKey) => {
    const active = Boolean(productForm[key]);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={active}
        onClick={() => {
          const next = !active;
          updateFormValue(key, next);
          if (!next && clearKey) updateFormValue(clearKey, "");
        }}
        style={{
          appearance: "none",
          border: active ? "1px solid #aaa39a" : "1px solid #dcd8d2",
          background: active ? "#f0f0f0" : "#ffffff",
          color: "#494540",
          borderRadius: 3,
          padding: "10px 14px",
          minHeight: 40,
          font: "inherit",
          fontSize: 13,
          fontWeight: 400,
          cursor: "pointer",
          boxShadow: "none",
          transition: "background .15s,border-color .15s,color .15s,box-shadow .15s",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span style={{
          width: 17,
          height: 17,
          borderRadius: 999,
          display: "inline-grid",
          placeItems: "center",
          background: active ? "#77716a" : "#ededed",
          color: active ? "#fff" : "#77716a",
          fontSize: 12,
          lineHeight: 1,
          fontWeight: 800,
        }}>{active ? "✓" : "+"}</span>
        {label}
      </button>
    );
  };

  const field = (key, label, placeholder, italic=false) => (
    <Field key={key} label={label} htmlFor={key}>
      <input
        id={key}
        type="text"
        placeholder={placeholder}
        style={{...inputStyle,fontStyle:italic?"italic":"normal"}}
        value={productForm[key] || ""}
        onChange={(e)=>updateFormValue(key,e.target.value)}
      />
    </Field>
  );

  return (
    <div key="doorHeading" style={{display:"grid",gap:14}}>
      <Field label="Text" htmlFor="doorHeading"><textarea id="doorHeading" rows={3} placeholder={getDoorSignExamples(selectedBadge).heading} style={inputStyle}
        value={[productForm.doorHeading || productForm.customText || "", ...(productForm.doorUseLine2 ? [productForm.doorExtra || ""] : productForm.customTextLine2 ? [productForm.customTextLine2] : [])].join("\n")}
        onChange={e=>{
          const lines=e.target.value.split(/\r?\n/).slice(0,3);
          updateFormValue("doorHeading",lines[0]);
          updateFormValue("doorUseLine2",lines.length>1);
          updateFormValue("doorExtra",lines.slice(1).join("\n"));
          updateFormValue("customText","");
          updateFormValue("customTextLine2","");
        }}/></Field>
      <div style={{display:"grid",gap:8}}>
        <div style={{fontWeight:700,fontSize:14}}>Lägg till fler uppgifter</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {choiceButton("doorUseName", "Namn", "doorName")}
          {choiceButton("doorUseTitle", "Titel", "doorTitle")}
          {hasBadgeField(selectedBadge,"doorNumber") ? choiceButton("doorUseNumber", "Nummer", "doorNumber") : null}
          {hasBadgeField(selectedBadge,"doorSymbol") ? choiceButton("doorUseSymbol", "Symbol", "doorSymbol") : null}
        </div>
      </div>
      {productForm.doorUseName ? <Field label="Namn" htmlFor="doorName"><textarea id="doorName" rows={2} placeholder={getDoorSignExamples(selectedBadge).name} style={inputStyle} value={productForm.doorName || ""} onChange={e=>updateFormValue("doorName",e.target.value.split(/\r?\n/).slice(0,2).join("\n"))}/></Field> : null}
      {productForm.doorUseTitle ? field("doorTitle","Titel",getDoorSignExamples(selectedBadge).title,true) : null}
      {hasBadgeField(selectedBadge,"doorNumber") && productForm.doorUseNumber ? renderDoorNumberInputs({Field,productForm,updateFormValue,inputStyle}) : null}
      {hasBadgeField(selectedBadge,"doorSymbol") && productForm.doorUseSymbol ? renderDoorSymbolInputs({Field,productForm,updateFormValue,inputStyle}) : null}
    </div>
  );
}

function renderDoorNumberInputs({ Field, productForm, updateFormValue, inputStyle }) {
  return <div style={{display:"grid",gap:12}}>

      <Field label="Nummer på skylten" htmlFor="doorNumber"><input id="doorNumber" type="text" inputMode="numeric" pattern="[0-9]+" required value={productForm.doorNumber || ""} onChange={event => updateFormValue("doorNumber", event.target.value.replace(/\D/g, ""))} style={inputStyle} /></Field>
      <Field label="Numrets placering" htmlFor="doorNumberSide"><select id="doorNumberSide" value={productForm.doorNumberSide || "left"} onChange={event => updateFormValue("doorNumberSide", event.target.value)} style={inputStyle}><option value="left">Vänster sida</option><option value="right">Höger sida</option></select></Field>

  </div>;
}

function renderDoorNumberField({ Field, selectedBadge, productForm, updateFormValue, inputStyle }) {
  if (isPersonalDoorSign(selectedBadge) && hasBadgeField(selectedBadge,"doorHeading")) return null;
  return <div key="doorNumber" style={{ display: "grid", gap: 12 }}>
    <button type="button" aria-pressed={Boolean(productForm.doorUseNumber)} onClick={() => {
      updateFormValue("doorUseNumber", !productForm.doorUseNumber);
      if (productForm.doorUseNumber) updateFormValue("doorNumber", "");
    }} style={{ background: "transparent", border: "1px solid #dcd8d2", borderRadius: 3, padding: "10px 14px", color: "#494540", font: "inherit", cursor: "pointer", width: "fit-content" }}>
      {productForm.doorUseNumber ? "✓ Nummer på skylten" : "+ Lägg till nummer"}
    </button>
    {productForm.doorUseNumber ? renderDoorNumberInputs({Field,productForm,updateFormValue,inputStyle}) : null}
  </div>;
}

function renderDoorSymbolInputs({Field,productForm,updateFormValue,inputStyle}) {
  const symbols=getDoorSignSymbols({includeInactive:true}).filter(symbol=>symbol.active!==false || symbol.id===productForm.doorSymbol);
  const previous=getDoorSignSymbolById(productForm.doorSymbol);
  if(previous && !symbols.some(symbol=>symbol.id===previous.id))symbols.push(previous);
  return <div style={{display:"grid",gap:12}}>
    <Field label="Symbol på skylten" htmlFor="doorSymbol"><select id="doorSymbol" required value={productForm.doorSymbol || ""} onChange={e=>{updateFormValue("doorSymbol",e.target.value);updateFormValue("doorSymbolName",getDoorSignSymbolById(e.target.value)?.name || "");}} style={inputStyle}><option value="">Välj symbol</option>{symbols.map(symbol=><option key={symbol.id} value={symbol.id}>{symbol.name}</option>)}</select></Field>
    {!symbols.length&&<div style={{fontSize:12,color:"#77716a"}}>Lägg till egna bilder under Symboler → Dörrskyltar i administrationen.</div>}
    <Field label="Symbolens placering" htmlFor="doorSymbolSide"><select id="doorSymbolSide" value={productForm.doorSymbolSide || "right"} onChange={e=>updateFormValue("doorSymbolSide",e.target.value)} style={inputStyle}><option value="left">Vänster sida</option><option value="right">Höger sida</option></select></Field>
  </div>;
}
function renderDoorSymbolField({Field,selectedBadge,productForm,updateFormValue,inputStyle}) {
  if (isPersonalDoorSign(selectedBadge) && hasBadgeField(selectedBadge,"doorHeading")) return null;
  return <div key="doorSymbol" style={{display:"grid",gap:12}}>
    <button type="button" aria-pressed={Boolean(productForm.doorUseSymbol)} onClick={()=>{updateFormValue("doorUseSymbol",!productForm.doorUseSymbol);if(productForm.doorUseSymbol)updateFormValue("doorSymbol","");}} style={{background:"transparent",border:"1px solid #dcd8d2",borderRadius:3,padding:"10px 14px",color:"#494540",font:"inherit",cursor:"pointer",width:"fit-content"}}>{productForm.doorUseSymbol?"✓ Symbol på skylten":"+ Lägg till symbol"}</button>
    {productForm.doorUseSymbol?renderDoorSymbolInputs({Field,productForm,updateFormValue,inputStyle}):null}
  </div>;
}

function renderHangingBackText({Field, selectedBadge, productForm, updateFormValue, setProductForm, inputStyle}) {
  const enabled = Boolean(productForm.hangingSignDifferentBackText);
  const doubleLine = isDoubleLineHangingSign(selectedBadge, productForm);
  const backForm = getHangingBackForm(productForm);
  const backContext = {selectedBadge, fieldId:"backHangingSignSymbols", productForm:backForm, updateFormValue:(key,value)=>updateFormValue(BACK_SELECTION_KEYS[key],value)};
  const setBackArrow = (placement,direction) => setProductForm(previous=>({...previous,
    backArrowPlacement:placement,backArrowDirection:direction,
    backLeftArrowDirection:placement === "left" ? direction || "none" : "none",
    backRightArrowDirection:placement === "right" ? direction || "none" : "none"}));
  const toggle = checked => setProductForm(previous=>{
    if (!checked || previous.hangingBackInitialized) return {...previous,hangingSignDifferentBackText:checked};
    const mirror = direction => ({left:"right",right:"left"})[direction] || direction;
    const placement = previous.arrowPlacement === "left" ? "right" : previous.arrowPlacement === "right" ? "left" : "none";
    const direction = mirror(previous.arrowDirection || "");
    return {...previous,hangingSignDifferentBackText:true,hangingBackInitialized:true,
      backTextLine1:previous.customTextLine1 || previous.customText || "",backTextLine2:previous.customTextLine2 || "",
      backArrowPlacement:placement,backArrowDirection:direction,
      backLeftArrowDirection:placement === "left" ? direction || "none" : "none",
      backRightArrowDirection:placement === "right" ? direction || "none" : "none",
      ...Object.fromEntries(HANGING_TARGET_KEYS.map(key=>[BACK_SELECTION_KEYS[key],hangingTargetFields(previous)[key]])),
      backHangingSignSymbols:previous.hangingSignSymbols || (previous.hangingSignSymbol && previous.hangingSignSymbol !== "none" ? [previous.hangingSignSymbol] : []),
      backHangingSignSymbol:previous.hangingSignSymbol || "none",backHangingUseSymbols:previous.hangingUseSymbols,backHangingUseTargets:previous.hangingUseTargets};
  });
  return <div key="hangingBackText" style={{display:"grid",gap:12}}>
    <OptionSwitch label="Anpassa baksidan" checked={enabled} onChange={toggle}/>
    {enabled && <section aria-label="Baksida" style={{display:"grid",gap:14,borderTop:"1px solid #eee",paddingTop:14}}>
      {!backForm.hangingSignWithoutText&&<Field label={doubleLine ? "Baksida – textrad 1" : "Baksida – text"} htmlFor="backTextLine1">
        <input id="backTextLine1" type="text" required value={productForm.backTextLine1 || ""} onChange={e=>updateFormValue("backTextLine1",e.target.value)} style={inputStyle}/>
      </Field>}
      {doubleLine&&!backForm.hangingSignWithoutText && <Field label="Baksida – textrad 2" htmlFor="backTextLine2">
        <input id="backTextLine2" type="text" required value={productForm.backTextLine2 || ""} onChange={e=>updateFormValue("backTextLine2",e.target.value)} style={inputStyle}/>
      </Field>}
      <Field label="Baksida – pilplacering" htmlFor="backArrowPlacement">
        <select id="backArrowPlacement" style={inputStyle} value={backForm.arrowPlacement || "none"} onChange={e=>{
          const placement=e.target.value;
          const valid=getArrowDirectionOptions({arrowPlacement:placement}).some(option=>option.value===backForm.arrowDirection);
          setBackArrow(placement,valid ? backForm.arrowDirection : "");
        }}><option value="none">Ingen pil</option><option value="left">Vänster sida</option><option value="right">Höger sida</option></select>
      </Field>
      {backForm.arrowPlacement && backForm.arrowPlacement !== "none" && <Field label="Baksida – pilriktning" htmlFor="backArrowDirection">
        <select id="backArrowDirection" required style={inputStyle} value={backForm.arrowDirection || ""} onChange={e=>setBackArrow(backForm.arrowPlacement,e.target.value)}><option value="">Välj...</option>{getArrowDirectionOptions(backForm).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>
      </Field>}
      {hasBadgeField(selectedBadge,"hangingSignSymbols") || hasBadgeField(selectedBadge,"hangingSignSymbol") ? renderHangingSignSymbolField(backContext) : null}
    </section>}
  </div>;
}

export const FIELD_RENDERERS = {
  vinylTextOptions: ({Field,selectedBadge,productForm,updateFormValue,inputStyle})=><div key="vinylTextOptions" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}><Field label="Texthöjd (mm)" htmlFor="vinylTextHeightMm"><input id="vinylTextHeightMm" type="number" min="1" max="500" step="0.1" required value={productForm.vinylTextHeightMm??selectedBadge?.defaultVinylTextHeightMm??40} style={inputStyle} onChange={event=>updateFormValue('vinylTextHeightMm',event.target.value)}/></Field><Field label="Textstil" htmlFor="vinylFontWeight"><select id="vinylFontWeight" value={productForm.vinylFontWeight??selectedBadge?.defaultVinylFontWeight??400} style={inputStyle} onChange={event=>updateFormValue('vinylFontWeight',Number(event.target.value))}><option value={400}>Arial Regular</option><option value={700}>Arial Bold – fet</option></select></Field></div>,
  hangingBackText: renderHangingBackText,
  poleHeight: ({productForm,updateFormValue})=><ParkingPoleFields key="poleHeight" form={productForm} onChange={value=>updateFormValue("poleHeightMm",value)}/>,
  areaDimensions: ({selectedBadge,productForm,updateFormValue,inputStyle}) => <AreaDimensionsFields key="areaDimensions" product={selectedBadge} form={productForm} onChange={updateFormValue} inputStyle={inputStyle}/>,
  destinationCube: ({selectedBadge,productForm,setProductForm,inputStyle}) => <DestinationCubeFields product={selectedBadge} key="destinationCube" form={productForm} inputStyle={inputStyle} onChange={changes=>setProductForm(previous=>({...previous,...changes}))}/>,
  dibond: ({selectedBadge,productForm,setProductForm,hideHelp=false,symbolCredential,editorView})=><DibondFields editorView={editorView} symbolCredential={symbolCredential} showHelp={!hideHelp} key="dibond" product={selectedBadge} form={productForm} onChange={changes=>setProductForm(previous=>({...previous,...changes}))}/>,
  doorSymbol: renderDoorSymbolField,
  doorNumber: renderDoorNumberField,
  name: createTextFieldRenderer("name"),
  title: createTextFieldRenderer("title"),
  titleLine2: createTextFieldRenderer("titleLine2"),
  orgLine1: createTextFieldRenderer("orgLine1"),
  orgLine2: createTextFieldRenderer("orgLine2"),
  customText: createTextFieldRenderer("customText"),
  customTextLine1: createTextFieldRenderer("customTextLine1"),
  customTextLine2: createTextFieldRenderer("customTextLine2"),
  doorHeading: renderDoorHeadingField,
  doorName: createTextFieldRenderer("doorName"),
  doorTitle: createTextFieldRenderer("doorTitle"),
  doorExtra: createTextFieldRenderer("doorExtra"),
  arrowPlacement: renderArrowPlacementField,
  arrowDirection: renderArrowDirectionField,
  // Hidden in the customer form. The values are maintained automatically
  // from arrowPlacement + arrowDirection for backwards-compatible previews.
  leftArrowDirection: () => null,
  hangingSignSymbol: renderHangingSignSymbolField,
  hangingSignSymbols: renderHangingSignSymbolField,
  rightArrowDirection: () => null,
  fastening: renderFasteningField,
  quantity: createNumberFieldRenderer("quantity", {
    fallbackLabel: "Antal",
    min: 1,
    fallbackValue: 1,
  }),
  extraMagnets: createNumberFieldRenderer("extraMagnets", {
    fallbackLabel: "Extra magnetfästen",
    min: 0,
    fallbackValue: 0,
  }),
};

export const DEFAULT_FIELD_ORDER = [
  "poleHeight",
  "destinationCube",
  "areaDimensions",
  "dibond",
  "name",
  "title",
  "titleLine2",
  "orgLine1",
  "orgLine2",
  "customText",
  "vinylTextOptions",
  "customTextLine1",
  "customTextLine2",
  "doorHeading",
  "doorNumber",
  "doorSymbol",
  "doorName",
  "doorTitle",
  "doorExtra",
  "arrowPlacement",
  "arrowDirection",
  "leftArrowDirection",
  "hangingSignSymbols",
  "rightArrowDirection",
  "hangingBackText",
  "fastening",
  "quantity",
  "extraMagnets",
];

export function renderConfiguredField(fieldKey, context) {
  const renderer = FIELD_RENDERERS[fieldKey];

  if (!renderer) {
    return null;
  }

  return renderer(context);
}

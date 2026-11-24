import { Children, cloneElement, createContext, isValidElement, useContext } from "react";

export const FieldErrorsContext = createContext({});

export default function Field({ label, htmlFor, children }) {
  const errors = useContext(FieldErrorsContext);
  const error = errors[htmlFor];
  const errorId = `${htmlFor}-error`;
  const content = Children.map(children, child => {
    if (!isValidElement(child) || child.props.id !== htmlFor) return child;
    return cloneElement(child, {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": [child.props["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined,
    });
  });
  return <div style={{ marginBottom: 10 }}>
    <label htmlFor={htmlFor}>{label}:</label><br />
    {content}
    {error && <p className="jsf-field-error" id={errorId} role="alert">{error}</p>}
  </div>;
}

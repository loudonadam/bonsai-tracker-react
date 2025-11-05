import React from "react";

const FieldLabel = ({ children, required = false, className = "", ...props }) => {
  const classes = ["inline-flex items-center gap-1 text-current", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      <span>{children}</span>
      {required && (
        <span className="text-rose-500" aria-hidden="true">
          *
        </span>
      )}
    </span>
  );
};

export default FieldLabel;

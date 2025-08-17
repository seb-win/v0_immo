"use client";
export default function RootError({ error }: { error: Error }) {
  return (
    <div className="p-6">
      <h2 className="font-semibold mb-2">Oops – etwas ist schiefgelaufen.</h2>
      <pre className="text-xs bg-neutral-100 p-3 rounded break-words whitespace-pre-wrap">
        {error.message}
      </pre>
    </div>
  );
}

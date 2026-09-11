import fs from 'fs';
let code = fs.readFileSync('src/components/InvoicesView.tsx', 'utf8');

// I'll wrap Desktop Table View in a condition
code = code.replace(
  '{/* Desktop Table View */}',
  '{viewMode === "list" ? (\n              <>\n            {/* Desktop Table View */}'
);

// I'll wrap Mobile Cards View in a condition
code = code.replace(
  '            {/* Mobile Cards View (Fits perfectly, no horizontal scrolling) */}',
  '            </>\n            ) : (\n            {/* Grid View (Desktop & Mobile) */}\n            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">\n              {filteredInvoices.map((inv) => (\n                <div \n                  key={inv.id}\n                  onClick={() => onSelectInvoice(inv)}\n                  className={`bg-white p-4 rounded-xl border transition-all duration-150 cursor-pointer ${selectedInvoice?.id === inv.id ? "border-indigo-500 shadow-md ring-2 ring-indigo-50" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}\n                >\n                  <div className="flex items-center justify-between mb-3">\n                    <span className="font-mono font-bold text-slate-900 text-sm truncate mr-2">{inv.invoiceNumber}</span>\n                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{new Date(inv.invoiceDate).toLocaleDateString("az-AZ")}</span>\n                  </div>\n                  <div className="mb-3">\n                    <p className="text-xs font-semibold text-slate-600 truncate">{inv.customerName}</p>\n                  </div>\n                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">\n                    <span className="font-mono font-black text-slate-900 text-sm">{inv.totalAmount.toLocaleString("az-AZ")} ₼</span>\n                    {inv.status === "paid" ? (\n                      <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">\n                        <CheckCircle className="w-3 h-3 mr-1" /> Ödənilib\n                      </span>\n                    ) : (\n                      <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">\n                        <Clock className="w-3 h-3 mr-1" /> Gözləyir\n                      </span>\n                    )}\n                  </div>\n                </div>\n              ))}\n            </div>\n            )}\n\n            {/* Mobile Cards View (Fits perfectly, no horizontal scrolling) */}'
);

// We should hide the original mobile view if we are now providing a unified grid, or just wrap it correctly.
// Let's remove the original Mobile Cards View since the new Grid handles both. Actually the old mobile view had some nice styling and delete buttons. 
// I'll just change the wrapper to check `viewMode === "list"` for the table, and `viewMode === "grid"` for the cards. But wait, on mobile we always want cards?
// No, user can use "siyahı" vs "grid" on mobile too. The original mobile view code handles the delete buttons, etc. Let's just restore from git and do it properly with `sed` or `ast`.

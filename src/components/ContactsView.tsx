import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Phone, MapPin, Search } from "lucide-react";
import { Contact } from "../types";

interface ContactsViewProps {
  contacts: Contact[];
  onAddContact: (contact: Partial<Contact>) => void;
  onDeleteContact: (id: string) => void;
  onEditContact: (id: string, contact: Partial<Contact>) => void;
  currentUser: { username: string; role: string } | null;
}

export default function ContactsView({ contacts, onAddContact, onDeleteContact, onEditContact, currentUser }: ContactsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

  const isAdminOrModerator = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const handleOpenModal = (contact?: Contact) => {
    if (contact) {
      setEditingId(contact.id);
      setFormData({ name: contact.name, phone: contact.phone, address: contact.address });
    } else {
      setEditingId(null);
      setFormData({ name: "", phone: "", address: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (editingId) {
      onEditContact(editingId, formData);
    } else {
      onAddContact(formData);
    }
    
    setIsModalOpen(false);
  };

  const sendToWhatsApp = (contact: Contact) => {
    // Format message
    const message = `Müştəri Məlumatı:\nAd: ${contact.name}\nTelefon: ${contact.phone || "Qeyd olunmayıb"}\nÜnvan: ${contact.address || "Qeyd olunmayıb"}`;
    // Encode for URL
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-display">Şəxsi Müştəri Məlumatları</h2>
          <p className="text-slate-500 text-sm mt-1">Burada şəxsi müştərilərinizin əlaqə məlumatlarını (telefon və ünvan) yadda saxlaya bilərsiniz.</p>
        </div>
        {isAdminOrModerator && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md font-medium transition shadow-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Yeni Əlavə Et</span>
            <span className="sm:hidden">Əlavə Et</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ad, nömrə və ya ünvan üzrə axtarış..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-semibold whitespace-nowrap">Müştəri Adı</th>
                <th className="p-4 font-semibold whitespace-nowrap">Telefon</th>
                <th className="p-4 font-semibold whitespace-nowrap">Ünvan</th>
                <th className="p-4 font-semibold whitespace-nowrap">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Məlumat tapılmadı.
                  </td>
                </tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition group">
                    <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{contact.name}</td>
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-sm">Qeyd olunmayıb</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      {contact.address ? (
                        <div className="flex items-start gap-1.5 min-w-[200px]">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words line-clamp-2" title={contact.address}>{contact.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-sm">Qeyd olunmayıb</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => sendToWhatsApp(contact)}
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                          title="WhatsApp-a göndər"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                          </svg>
                          Göndər
                        </button>
                        
                        {isAdminOrModerator && (
                          <button
                            onClick={() => handleOpenModal(contact)}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Düzəliş
                          </button>
                        )}
                        {currentUser?.role === "admin" && (
                          <button
                            onClick={() => {
                              if(window.confirm("Bu məlumatı silmək istədiyinizə əminsiniz?")) {
                                onDeleteContact(contact.id);
                              }
                            }}
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? "Məlumatı Yenilə" : "Yeni Məlumat"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Müştəri Adı *</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  placeholder="Məs: Əli Əliyev"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon Nömrəsi</label>
                <input 
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  placeholder="Məs: +994 50 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ünvan</label>
                <textarea 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  placeholder="Məs: Bakı ş., Nizami r."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition"
                >
                  {editingId ? "Yadda Saxla" : "Əlavə Et"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

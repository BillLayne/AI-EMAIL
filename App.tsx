
import React, { useState, useEffect, useCallback, ChangeEvent, useRef, useMemo } from 'react';
import { EmailFormData, Template, ToastMessage, ToastType, CancellationData, Agent, Recipient, RecipientList } from './types';
import { DOCUMENT_TYPES, TONE_OPTIONS, QUOTE_TYPE_OPTIONS, INITIAL_FORM_DATA, AGENCY_DETAILS, DEFAULT_TEMPLATES, RENEWAL_TYPE_OPTIONS, AGENTS, LATE_PAYMENT_CARRIERS, RECEIPT_PRODUCT_OPTIONS, RECIPIENT_LISTS_STORAGE_KEY } from './constants';
import { generateSubjectLines, generatePreheaders, generateEmailBody, generateHomeQuoteProse, generateAutoQuoteProse, generateHeroImage, extractQuoteFromPdf, extractAutoQuoteFromPdf, extractRenewalInfoFromPdf, extractCancellationsFromPdf, generateRateChangeExplanation, generateVideo, generatePromptFromPdf, extractNewPolicyInfoFromPdf, extractReceiptInfoFromPdf, extractReceiptInfoFromText, extractChangeInfoFromText } from './services/geminiService';
import { assembleEmailHtml } from './services/emailService';
import { assembleHomeQuoteHtml } from './services/homeQuoteTemplate';
import { assembleAutoQuoteHtml } from './services/autoQuoteTemplate';
import { assembleRenewalHtml } from './services/renewalTemplate';
import { assembleLatePaymentHtml } from './services/latePaymentTemplate';
import { assembleReceiptHtml } from './services/receiptTemplate';
import { assembleWelcomeHtml } from './services/welcomeTemplate';


const TEMPLATES_STORAGE_KEY = 'billLayneAiEmailTemplates_v1';

// --- UTILITY FUNCTIONS ---

const fileToDataURL = (file: File, maxWidth: number | null): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (!maxWidth) return resolve(rawDataUrl);

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxWidth) return resolve(rawDataUrl);

        const ratio = maxWidth / width;
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = Math.round(height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(rawDataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type, 0.9));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
};

const copyHtmlToClipboard = async (html: string): Promise<boolean> => {
    try {
        const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const blobHtml = new Blob([html], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);
        return true;
    } catch (error) {
        console.error('Failed to copy HTML to clipboard:', error);
        return false;
    }
};

const getSubjectForDocumentType = (docType: string, policyHolder: string = '', changeRequestType: 'request' | 'confirmation' = 'request'): string => {
    const agency = AGENCY_DETAILS.shortName;
    const ph = policyHolder.trim() ? ` - ${policyHolder.trim()}` : '';
    switch (docType) {
      case 'Auto Documentation': return `Your Auto Ins Docs from ${agency}${ph}`;
      case 'Home Documentation': return `Your Home Ins Docs from ${agency}${ph}`;
      case 'Commercial Documentation': return `Your Commercial Ins Docs from ${agency}${ph}`;
      case 'General Documentation': return `Ins Documentation from ${agency}${ph}`;
      case 'Insurance Quote': return `Your Insurance Quote from ${agency}${ph}`;
      case 'New Policy Welcome': return `Welcome! Your New Policy from ${agency} Is Here`;
      case 'Policy Renewal': return `Important: Policy Renewal Info from ${agency}${ph}`;
      case 'Change / Underwriting Request': 
        return changeRequestType === 'request'
          ? `Policy Change Request from ${agency}${ph}`
          : `Confirmation of Policy Change from ${agency}${ph}`;
      case 'Late Payment Notice': return `URGENT: Your insurance policy is pending cancellation`;
      case 'Receipt': return `Your Payment Receipt from ${agency}${ph}`;
      case 'AI Prompt': return `Important Update Regarding Your Policy from ${agency}${ph}`;
      case 'Custom Message': return `Message from ${agency}${ph}`;
      case 'Promotional / Newsletter': return `News & Offers from ${agency}`;
      default: return '';
    }
};

// --- ICON COMPONENTS ---

const IconWand = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 16v-2m-7.5-13.5L6 4m12 1.5L16.5 7M3 10h2m14 0h2m-9 9.5L6 20m12-1.5l-1.5-1.5M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/></svg>;
const IconSpinner = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconMail = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IconFolder = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>;
const IconSave = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const IconFilePlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>;
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconUsers = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
const IconUserPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>;
const IconVideo = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>;


// --- REUSABLE UI COMPONENTS ---

interface FormFieldProps {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}
const FormField: React.FC<FormFieldProps> = ({ label, id, children, className }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', isLoading = false, children, ...props }, ref) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900";
  const variantClasses = {
    primary: 'bg-brand-primary-600 text-white hover:bg-brand-primary-700 focus:ring-brand-primary-500',
    secondary: 'bg-brand-secondary text-white hover:bg-opacity-90 focus:ring-brand-secondary',
    ghost: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-brand-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return (
    <button ref={ref} {...props} className={`${baseClasses} ${variantClasses[variant]} ${isLoading || props.disabled ? 'cursor-not-allowed opacity-70' : ''}`} disabled={isLoading || props.disabled}>
      {isLoading ? <IconSpinner /> : children}
    </button>
  );
});

// --- RECIPIENT LISTS MODAL ---
interface RecipientListsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: RecipientList[];
    onSave: (lists: RecipientList[]) => void;
    showToast: (message: string, type?: ToastType) => void;
}

const RecipientListsModal: React.FC<RecipientListsModalProps> = ({ isOpen, onClose, lists, onSave, showToast }) => {
    const [internalLists, setInternalLists] = useState<RecipientList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [newRecipientsText, setNewRecipientsText] = useState('');
    const importFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const listsCopy = JSON.parse(JSON.stringify(lists));
            setInternalLists(listsCopy);
            if (listsCopy.length > 0 && !selectedListId) {
                setSelectedListId(listsCopy[0].id);
            } else if (listsCopy.length === 0) {
                setSelectedListId(null);
            }
        }
    }, [isOpen, lists]);

    if (!isOpen) return null;

    const handleCreateList = () => {
        const name = newListName.trim();
        if (!name) return;
        const newList: RecipientList = {
            id: `list-${Date.now()}`,
            name,
            savedAt: Date.now(),
            recipients: [],
        };
        const updatedLists = [...internalLists, newList];
        setInternalLists(updatedLists);
        setSelectedListId(newList.id);
        setNewListName('');
    };
    
    const handleDeleteList = (listId: string) => {
        if (!window.confirm("Are you sure you want to delete this list and all its recipients?")) return;
        const updatedLists = internalLists.filter(l => l.id !== listId);
        setInternalLists(updatedLists);
        if (selectedListId === listId) {
            setSelectedListId(updatedLists.length > 0 ? updatedLists[0].id : null);
        }
    };
    
    const handleDeleteRecipient = (listId: string, email: string) => {
        setInternalLists(prevLists =>
            prevLists.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        recipients: list.recipients.filter(r => r.email !== email),
                    };
                }
                return list;
            })
        );
    };

    const handleAddRecipients = () => {
        if (!selectedListId || !newRecipientsText.trim()) return;
        const lines = newRecipientsText.trim().split('\n');
        const newRecipients: Recipient[] = [];
        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            const [email, firstName, policyHolder] = parts;
            if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                newRecipients.push({ email, firstName: firstName || '', policyHolder: policyHolder || firstName || '' });
            }
        });
        
        if (newRecipients.length === 0) return;

        setInternalLists(prevLists => 
            prevLists.map(list => {
                if (list.id === selectedListId) {
                    const existingEmails = new Set(list.recipients.map(r => r.email));
                    const uniqueNewRecipients = newRecipients.filter(nr => !existingEmails.has(nr.email));
                    return { ...list, recipients: [...list.recipients, ...uniqueNewRecipients] };
                }
                return list;
            })
        );
        setNewRecipientsText('');
    };

    const handleSaveAndClose = () => {
        onSave(internalLists);
        onClose();
    };

    const handleExport = () => {
        if (internalLists.length === 0) {
            showToast("There are no lists to export.", "warning");
            return;
        }
        const dataStr = JSON.stringify(internalLists, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'recipient-lists-backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showToast("Recipient lists exported successfully!", "success");
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                const importedLists = JSON.parse(text as string) as RecipientList[];
                
                // Basic validation
                if (!Array.isArray(importedLists) || (importedLists.length > 0 && (!importedLists[0].id || !importedLists[0].name))) {
                    throw new Error("Invalid file format.");
                }

                const existingIds = new Set(internalLists.map(t => t.id));
                const newLists = importedLists.filter(t => !existingIds.has(t.id));

                if (newLists.length > 0) {
                    setInternalLists(prev => [...prev, ...newLists]);
                    showToast(`Successfully imported ${newLists.length} new recipient lists.`, "success");
                } else {
                    showToast("No new lists to import. All lists in the file already exist.", "info");
                }
            } catch (error) {
                showToast("Import failed. The file is either corrupted or not a valid list backup.", "error");
            } finally {
                // Reset file input
                if (importFileInputRef.current) {
                    importFileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };

    const selectedList = internalLists.find(l => l.id === selectedListId);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">Manage Recipient Lists</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><IconX /></button>
                </div>
                <div className="flex-grow flex min-h-0">
                    {/* Left Panel: List of Lists */}
                    <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
                        <div className="p-4 space-y-2 border-b dark:border-gray-700">
                            <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name..." className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                            <Button onClick={handleCreateList} variant="secondary" disabled={!newListName.trim()} className="w-full"><IconFilePlus /> Create List</Button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            {internalLists.map(list => (
                                <div key={list.id} onClick={() => setSelectedListId(list.id)} className={`p-3 cursor-pointer border-l-4 flex justify-between items-center ${selectedListId === list.id ? 'bg-brand-primary-50 dark:bg-brand-primary-900/50 border-brand-primary-500' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                                    <div>
                                        <p className="font-semibold">{list.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{list.recipients.length} recipients</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><IconTrash /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right Panel: Selected List Details */}
                    <div className="w-2/3 flex flex-col">
                        {selectedList ? (
                            <>
                                <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
                                    <h3 className="text-lg font-bold mb-2">{selectedList.name}</h3>
                                    <textarea value={newRecipientsText} onChange={e => setNewRecipientsText(e.target.value)} rows={4} placeholder="Paste data here, one per line:&#10;email@example.com,FirstName,PolicyHolderName" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"></textarea>
                                    <Button onClick={handleAddRecipients} disabled={!newRecipientsText.trim()} className="mt-2"><IconUserPlus /> Add Recipients</Button>
                                </div>
                                <div className="overflow-y-auto flex-grow">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900"><tr className="text-left text-gray-600 dark:text-gray-300">
                                            <th className="p-3 font-semibold">Email</th>
                                            <th className="p-3 font-semibold">First Name</th>
                                            <th className="p-3 font-semibold">Policy Holder</th>
                                            <th className="p-3 font-semibold"></th>
                                        </tr></thead>
                                        <tbody>{selectedList.recipients.map(r => (
                                            <tr key={r.email} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-3 font-mono">{r.email}</td>
                                                <td className="p-3">{r.firstName}</td>
                                                <td className="p-3">{r.policyHolder}</td>
                                                <td className="p-3 text-right"><button onClick={() => handleDeleteRecipient(selectedList.id, r.email)} className="p-1 text-gray-400 hover:text-red-500"><IconTrash /></button></td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Select or create a list to get started.</div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handleExport}><IconDownload /> Export All</Button>
                        <Button variant="ghost" onClick={() => importFileInputRef.current?.click()}><IconUpload /> Import from File</Button>
                        <input type="file" ref={importFileInputRef} accept=".json" onChange={handleImport} className="hidden" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveAndClose}>Save & Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white transition-opacity duration-300">
    <IconSpinner className="w-12 h-12" />
    <p className="mt-4 text-lg font-semibold tracking-wide">{message}</p>
  </div>
);


// --- MAIN APP COMPONENT ---

export default function App() {
  const [formData, setFormData] = useState<EmailFormData>(INITIAL_FORM_DATA);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [preheaderSuggestions, setPreheaderSuggestions] = useState<string[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [appDarkMode, setAppDarkMode] = useState(false);
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [emailSize, setEmailSize] = useState(0);
  const [imageGenPrompt, setImageGenPrompt] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [clearCustomerData, setClearCustomerData] = useState(true);
  const [cancellationList, setCancellationList] = useState<CancellationData[]>([]);
  const [pastedReceiptText, setPastedReceiptText] = useState('');
  const [pastedChangeRequestText, setPastedChangeRequestText] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cancellationPdfInputRef = useRef<HTMLInputElement>(null);
  const importTemplatesFileInputRef = useRef<HTMLInputElement>(null);
  const aiPromptPdfInputRef = useRef<HTMLInputElement>(null);
  const receiptPdfInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);


  // New state for bulk mode
  const [composeMode, setComposeMode] = useState<'single' | 'bulk'>('single');
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isListsModalOpen, setIsListsModalOpen] = useState(false);

  // New state for video generation
  const [videoGenPrompt, setVideoGenPrompt] = useState('');
  const [videoPlayerUrl, setVideoPlayerUrl] = useState(() => {
    try {
        const storedUrl = localStorage.getItem('videoPlayerUrl_v1');
        return storedUrl || 'https://ai-email-composer.netlify.app/player.html';
    } catch {
        return 'https://ai-email-composer.netlify.app/player.html';
    }
  });
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setAppDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);

    try {
        const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
        setTemplates(storedTemplates ? JSON.parse(storedTemplates) : DEFAULT_TEMPLATES);
        const storedLists = localStorage.getItem(RECIPIENT_LISTS_STORAGE_KEY);
        setRecipientLists(storedLists ? JSON.parse(storedLists) : []);
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        setTemplates(DEFAULT_TEMPLATES);
        setRecipientLists([]);
    }
  }, []);
  
  useEffect(() => {
    if (formData.documentType && composeMode === 'single') {
      const newSubject = getSubjectForDocumentType(formData.documentType, formData.policyHolder, formData.changeRequestType);
      setFormData(prev => ({ ...prev, emailSubject: newSubject }));
    } else if (formData.documentType && composeMode === 'bulk') {
      const newSubject = getSubjectForDocumentType(formData.documentType, '{{policyHolder}}', formData.changeRequestType);
      setFormData(prev => ({ ...prev, emailSubject: newSubject }));
    }
  }, [formData.documentType, formData.policyHolder, composeMode, formData.changeRequestType]);

  // Effect to auto-calculate monthly premium
  useEffect(() => {
    const totalPremium = parseFloat(formData.quoteAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(totalPremium) || totalPremium === 0) {
      setFormData(prev => ({ ...prev, monthlyPremium: '' }));
      return;
    }

    const docType = formData.documentType;
    const isAuto = (docType === 'Insurance Quote' && formData.quoteType === 'Auto') || ((docType === 'Policy Renewal' || docType === 'New Policy Welcome') && formData.renewalType === 'Auto');
    
    const term = isAuto ? parseInt(formData.policyTerm, 10) : 12;

    if (isNaN(term) || term === 0) return;

    const monthly = (totalPremium / term).toFixed(2);
    setFormData(prev => ({ ...prev, monthlyPremium: `$${monthly}` }));
  }, [formData.quoteAmount, formData.policyTerm, formData.documentType, formData.quoteType, formData.renewalType]);

  // Effect to update late payment link when carrier changes
  useEffect(() => {
    if (formData.documentType === 'Late Payment Notice' && formData.carrierName) {
      const carrier = LATE_PAYMENT_CARRIERS.find(c => c.id === formData.carrierName);
      if (carrier) {
        setFormData(prev => ({ ...prev, latePaymentLink: carrier.paymentLink }));
      }
    }
  }, [formData.documentType, formData.carrierName]);

  // Effect to clear rate change explanation if premiums change
  useEffect(() => {
    setFormData(prev => ({ ...prev, renewalRateExplanation: '' }));
  }, [formData.quoteAmount, formData.previousQuoteAmount]);

  const allRecipients = useMemo(() => {
    const recipientMap = new Map<string, Recipient>();
    recipientLists.forEach(list => {
        list.recipients.forEach(recipient => {
            if (recipient.email) {
                recipientMap.set(recipient.email, recipient);
            }
        });
    });
    return Array.from(recipientMap.values());
  }, [recipientLists]);


  const toggleAppDarkMode = () => {
    setAppDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({ ...prev, [id]: isCheckbox ? checked : value }));
  };

  const handleRecipientEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({ ...prev, recipientEmail: email }));

    const matchedRecipient = allRecipients.find(r => r.email === email);
    if (matchedRecipient) {
        setFormData(prev => ({
            ...prev,
            recipientName: matchedRecipient.firstName,
            policyHolder: matchedRecipient.policyHolder,
        }));
    }
  };

  const handleSuggestSubjects = async () => {
    setLoadingMessage("Generating subjects...");
    setSubjectSuggestions([]);
    try {
        const suggestions = await generateSubjectLines(formData);
        if (suggestions.length > 0) {
          setSubjectSuggestions(suggestions);
          showToast('Subject suggestions generated!', 'success');
        } else {
          showToast('Could not generate subject suggestions.', 'error');
        }
    } catch (error) {
        console.error("Error suggesting subjects:", error);
        showToast("An error occurred while suggesting subjects.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };
  
  const handleSuggestPreheaders = async () => {
    setLoadingMessage("Generating preheaders...");
    setPreheaderSuggestions([]);
    try {
        const suggestions = await generatePreheaders(formData);
        if (suggestions.length > 0) {
            setPreheaderSuggestions(suggestions);
            showToast('Preheader suggestions generated!', 'success');
        } else {
            showToast('Could not generate preheader suggestions.', 'error');
        }
    } catch (error) {
        console.error("Error suggesting preheaders:", error);
        showToast("An error occurred while suggesting preheaders.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };

  const getPreheaderText = useCallback(() => {
    if (formData.emailPreheader) return formData.emailPreheader;

    const { documentType: docType, policyHolder } = formData;
    const ph = policyHolder ? ` for ${policyHolder}`:'';
    switch(docType){
      case 'Auto Documentation': return `Find your auto insurance documents attached${ph}.`;
      case 'Home Documentation': return `Your home insurance documents are here${ph}.`;
      case 'Commercial Documentation': return `Attached: Commercial insurance documents${ph}.`;
      case 'General Documentation': return `Important insurance documentation enclosed${ph}.`;
      case 'Insurance Quote': return `Your personalized insurance quote is ready${ph}!`;
      case 'New Policy Welcome': return `Welcome! We're thrilled to have you as a client.`;
      case 'Policy Renewal': return `Action needed: Review your policy renewal info${ph}.`;
      case 'Late Payment Notice': return `Immediate action is required to avoid a lapse in your coverage.`;
      case 'Receipt': return `Thank you for your payment. Your receipt is enclosed.`;
      case 'AI Prompt': `An important update regarding your policy is inside.`;
      case 'Custom Message': return `A message from Bill Layne Insurance regarding your account.`;
      case 'Promotional / Newsletter': return `See our latest updates, tips, and special offers.`;
      default: return `Important information from Bill Layne Insurance Agency.`;
    }
  }, [formData.documentType, formData.policyHolder, formData.emailPreheader]);

  const needsAiButton = ['Custom Message', 'Promotional / Newsletter', 'AI Prompt', 'Auto Documentation', 'Home Documentation', 'Commercial Documentation', 'General Documentation', 'Change / Underwriting Request'].includes(formData.documentType);

  const handleGenerateAndPreview = async () => {
    if (formData.documentType === '') {
        showToast('Please select an email purpose first.', 'warning');
        return;
    }

    if (composeMode === 'single' && formData.recipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail)) {
        setRecipientLists(prevLists => {
            const listsCopy: RecipientList[] = JSON.parse(JSON.stringify(prevLists));
            let allContactsList = listsCopy.find(l => l.name === 'All Contacts');

            if (!allContactsList) {
                allContactsList = { id: `list-all-contacts-${Date.now()}`, name: 'All Contacts', savedAt: Date.now(), recipients: [] };
                listsCopy.push(allContactsList);
            }
            
            const existingRecipientIndex = allContactsList.recipients.findIndex(r => r.email === formData.recipientEmail);

            const newRecipient: Recipient = {
                email: formData.recipientEmail,
                firstName: formData.recipientName || '',
                policyHolder: formData.policyHolder || formData.recipientName || ''
            };

            if (existingRecipientIndex > -1) {
                allContactsList.recipients[existingRecipientIndex] = newRecipient;
            } else {
                allContactsList.recipients.push(newRecipient);
            }
            
            saveRecipientListsToStorage(listsCopy);
            return listsCopy;
        });
    }
    
    setLoadingMessage("Generating email preview...");
    
    try {
        const selectedAgent = AGENTS.find(a => a.id === formData.agentId) || AGENTS[0];
        let effectiveFormData = { ...formData };
        if (composeMode === 'bulk') {
          effectiveFormData.recipientName = '{{recipientName}}';
          effectiveFormData.policyHolder = '{{policyHolder}}';
          effectiveFormData.recipientEmail = ''; // No single recipient in bulk mode
        }

        let finalHtml = '';

        if (effectiveFormData.documentType === 'Insurance Quote' && effectiveFormData.quoteType === 'Home') {
            const prose = await generateHomeQuoteProse(effectiveFormData);
            if (!prose) {
                showToast("AI failed to generate email text. Please try again.", 'error');
                return;
            }
            finalHtml = assembleHomeQuoteHtml(effectiveFormData, prose, selectedAgent);
        }
        else if (effectiveFormData.documentType === 'Insurance Quote' && effectiveFormData.quoteType === 'Auto') {
            const prose = await generateAutoQuoteProse(effectiveFormData);
            if (!prose) {
                showToast("AI failed to generate email text. Please try again.", 'error');
                return;
            }
            finalHtml = assembleAutoQuoteHtml(effectiveFormData, prose, selectedAgent);
        }
        else if (effectiveFormData.documentType === 'Policy Renewal') {
            finalHtml = assembleRenewalHtml(effectiveFormData, selectedAgent);
        }
        else if (effectiveFormData.documentType === 'New Policy Welcome') {
            finalHtml = assembleWelcomeHtml(effectiveFormData, selectedAgent);
        }
        else if (effectiveFormData.documentType === 'Late Payment Notice') {
            finalHtml = assembleLatePaymentHtml(effectiveFormData, selectedAgent);
        }
        else if (effectiveFormData.documentType === 'Receipt') {
            finalHtml = assembleReceiptHtml(effectiveFormData, selectedAgent);
        }
        else {
            if (needsAiButton && !effectiveFormData.customPrompt) {
                showToast('Please enter a prompt for the email body.', 'warning');
                return;
            }
            const bodyContent = await generateEmailBody(effectiveFormData, selectedAgent);
            if (bodyContent.includes("Error generating content")) {
                showToast("AI failed to generate email body. Please try again.", 'error');
                return;
            }
            finalHtml = assembleEmailHtml(
                effectiveFormData.emailSubject,
                getPreheaderText(),
                bodyContent,
                effectiveFormData,
                selectedAgent
            );
        }

        const bytes = new Blob([finalHtml]).size;
        setEmailSize(bytes / 1024);
        setGeneratedHtml(finalHtml);
        setPreviewVisible(true);
        showToast('Email preview is ready.', 'success');
    } catch (error) {
        console.error("Error generating preview: ", error);
        showToast("An error occurred while generating the preview.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };

  const handleGenerateRateExplanation = async () => {
    const currentPremium = formData.quoteAmount;
    const previousPremium = formData.previousQuoteAmount;

    if (!currentPremium || !previousPremium) {
        showToast('Please enter both current and previous premiums.', 'warning');
        return;
    }
    
    setLoadingMessage("Analyzing premium change...");
    try {
        const explanation = await generateRateChangeExplanation(previousPremium, currentPremium);
        setFormData(prev => ({ ...prev, renewalRateExplanation: explanation }));
        if (explanation) {
            showToast('Explanation generated!', 'success');
        } else {
            showToast('Could not generate an explanation.', 'error');
        }
    } catch(error) {
        console.error("Error generating explanation:", error);
        showToast("An error occurred while generating the explanation.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };


  useEffect(() => {
    if (previewVisible && iframeRef.current?.contentDocument?.body) {
        const docBody = iframeRef.current.contentDocument.body;
        if (previewDarkMode) {
            docBody.classList.add('dark-mode-preview');
        } else {
            docBody.classList.remove('dark-mode-preview');
        }
    }
  }, [previewDarkMode, previewVisible]);
  
  const handleOpenGmail = async () => {
    if (!generatedHtml) {
        showToast('Please preview the email first to generate the final HTML.', 'warning');
        return;
    }
    setLoadingMessage("Copying to clipboard...");
    try {
        const bodyContentMatch = generatedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const contentToCopy = bodyContentMatch ? bodyContentMatch[1].trim() : generatedHtml;

        const ok = await copyHtmlToClipboard(contentToCopy);
        if (ok) {
            showToast('Email HTML copied! Paste into Gmail.', 'success');
            const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(formData.recipientEmail)}&su=${encodeURIComponent(formData.emailSubject)}`;
            window.open(url, '_blank');
        } else {
            showToast('Auto-copy failed. Please copy manually from the preview.', 'error');
        }
    } catch (error) {
        console.error("Error opening Gmail:", error);
        showToast("An error occurred while opening Gmail.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };

  const handleDownloadHtml = () => {
    if (!generatedHtml) {
        showToast('Please generate a preview first to download the HTML.', 'warning');
        return;
    }

    const getProductNameForFilename = (data: EmailFormData): string => {
        const docType = data.documentType;
        if (docType === 'Insurance Quote') return `${data.quoteType} Quote`;
        if (docType === 'Policy Renewal') return `${data.renewalType} Renewal`;
        if (docType === 'New Policy Welcome') return `New ${data.renewalType} Policy`;
        if (docType === 'Receipt') return `${data.receiptProduct} Receipt`;
        return docType;
    };

    const policyHolder = formData.policyHolder.trim() || 'Client';
    const productName = getProductNameForFilename(formData);

    const safePolicyHolder = policyHolder.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
    const safeProductName = productName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
    
    const filename = `${safePolicyHolder}-${safeProductName}.html`;

    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded: ${filename}`, 'success');
  };
  
  const handleHeroFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          showToast('Please select an image file.', 'error');
          return;
      }
      setLoadingMessage("Processing image...");
      try {
          const dataUrl = await fileToDataURL(file, 1200);
          setFormData(prev => ({ ...prev, heroUrl: dataUrl }));
          showToast('Hero image uploaded and ready.', 'success');
      } catch (error) {
          showToast('Failed to load image.', 'error');
          console.error(error);
      } finally {
        setLoadingMessage(null);
      }
  };

  const handleGenerateImage = async () => {
    if (!imageGenPrompt) {
        showToast('Please enter a prompt for the image.', 'warning');
        return;
    }
    setLoadingMessage("Creating AI image...");
    try {
        const imageUrl = await generateHeroImage(imageGenPrompt);

        if (imageUrl) {
            setFormData(prev => ({
                ...prev,
                heroUrl: imageUrl,
                heroAlt: imageGenPrompt,
            }));
            showToast('AI Hero image generated successfully!', 'success');
        } else {
            showToast('Failed to generate AI image. Please try again.', 'error');
        }
    } catch (error) {
        console.error("Error generating image:", error);
        showToast("An error occurred while generating the image.", "error");
    } finally {
        setLoadingMessage(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoGenPrompt) {
        showToast('Please enter a prompt for the video.', 'warning');
        return;
    }
    if (!videoPlayerUrl || !videoPlayerUrl.startsWith('http')) {
        showToast('Please enter a valid, hosted URL for your player page.', 'warning');
        return;
    }

    setGeneratedVideoUrl(null);
    const onProgress = (status: string) => setLoadingMessage(status);

    try {
        const videoUri = await generateVideo(videoGenPrompt, onProgress);
        
        if (videoUri) {
            setLoadingMessage('Processing final video...');
            const response = await fetch(`/api/video-proxy?uri=${encodeURIComponent(videoUri)}`);
            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
            
            const videoBlob = await response.blob();
            const blobUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoUrl(blobUrl);

            const videoElement = document.createElement('video');
            videoElement.src = blobUrl;
            videoElement.muted = true;

            videoElement.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1280;
                canvas.height = 720;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    showToast('Could not create thumbnail.', 'error');
                    return;
                }
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2 - 25, canvas.height / 2 - 40);
                ctx.lineTo(canvas.width / 2 - 25, canvas.height / 2 + 40);
                ctx.lineTo(canvas.width / 2 + 50, canvas.height / 2);
                ctx.closePath();
                ctx.fill();
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.9);

                setFormData(prev => ({
                    ...prev,
                    heroUrl: thumbnailUrl,
                    heroAlt: `Video thumbnail: ${videoGenPrompt}`,
                    heroLink: `${videoPlayerUrl}?video=${encodeURIComponent(videoUri)}`
                }));
                showToast('Video thumbnail set as Hero Image!', 'success');
            };
        } else {
            showToast('Failed to generate video. Please try again.', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Failed to process the generated video.', 'error');
    } finally {
        setLoadingMessage(null);
    }
  };

  // --- PDF UPLOAD ---
  const handleTriggerPdfUpload = () => pdfInputRef.current?.click();

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingMessage("Analyzing PDF document...");
    showToast('Analyzing PDF... this may take a moment.', 'info');

    try {
        let extractedData: Partial<EmailFormData> | null = null;

        if (formData.documentType === 'Insurance Quote') {
            if (formData.quoteType === 'Home') {
                extractedData = await extractQuoteFromPdf(file);
            } else if (formData.quoteType === 'Auto') {
                extractedData = await extractAutoQuoteFromPdf(file);
            }
        } else if (formData.documentType === 'Policy Renewal') {
            extractedData = await extractRenewalInfoFromPdf(file);
        } else if (formData.documentType === 'New Policy Welcome') {
            extractedData = await extractNewPolicyInfoFromPdf(file);
        }
        
        if (extractedData) {
            setFormData(prev => ({ ...prev, ...extractedData }));
            showToast('Details successfully extracted from PDF!', 'success');
        } else {
            showToast('Could not extract details from the PDF. Please check the file or fill manually.', 'error');
        }
    } catch (error) {
        console.error("PDF processing error:", error);
        showToast('An error occurred during PDF processing.', 'error');
    } finally {
        setLoadingMessage(null);
        if (e.target) {
            e.target.value = ''; // Reset file input
        }
    }
  };
  
  const handleAiPromptPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingMessage("Generating content from PDF...");
    showToast('Analyzing PDF to generate email content...', 'info');

    try {
        const result = await generatePromptFromPdf(file);
        
        if (result) {
            setFormData(prev => ({ 
                ...prev, 
                customPrompt: result.customPrompt,
                policyHolder: result.policyHolder || prev.policyHolder,
                recipientName: result.recipientName || prev.recipientName,
            }));
            showToast('Email content and policy holder name populated from PDF!', 'success');
        } else {
            showToast('Could not generate content from the PDF. Please check the file or write a prompt manually.', 'error');
        }
    } catch (error) {
        console.error("AI Prompt PDF processing error:", error);
        showToast('An error occurred during PDF processing.', 'error');
    } finally {
        setLoadingMessage(null);
        if (e.target) {
            e.target.value = ''; // Reset file input
        }
    }
  };

  const handleReceiptPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingMessage("Analyzing PDF receipt...");
    try {
        const data = await extractReceiptInfoFromPdf(file);
        if (data) {
            setFormData(prev => ({ ...prev, ...data }));
            showToast('Receipt details extracted from PDF!', 'success');
        } else {
            showToast('Could not extract receipt details from the PDF.', 'error');
        }
    } catch (error) {
        showToast('An error occurred during PDF analysis.', 'error');
    } finally {
        setLoadingMessage(null);
        if (e.target) e.target.value = '';
    }
  };

  const handleAnalyzePastedReceipt = async () => {
    if (!pastedReceiptText.trim()) return;
    setLoadingMessage("Analyzing receipt text...");
    try {
        const data = await extractReceiptInfoFromText(pastedReceiptText);
        if (data) {
            setFormData(prev => ({ ...prev, ...data }));
            setPastedReceiptText('');
            showToast('Receipt details extracted from text!', 'success');
        } else {
            showToast('Could not extract receipt details from the text.', 'error');
        }
    } catch (error) {
        showToast('An error occurred during text analysis.', 'error');
    } finally {
        setLoadingMessage(null);
    }
  };

  const handleAnalyzePastedChangeRequest = async () => {
    if (!pastedChangeRequestText.trim()) return;
    setLoadingMessage("Analyzing request text...");
    try {
        const data = await extractChangeInfoFromText(pastedChangeRequestText);
        if (data) {
            setFormData(prev => ({ ...prev, ...data }));
            setPastedChangeRequestText('');
            showToast('Details extracted from text!', 'success');
        } else {
            showToast('Could not extract details from the text.', 'error');
        }
    } catch (error) {
        showToast('An error occurred during text analysis.', 'error');
    } finally {
        setLoadingMessage(null);
    }
  };


  const handleCancellationPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingMessage("Extracting data from report...");
    showToast('Analyzing cancellation report PDF...', 'info');
    setCancellationList([]);

    try {
        const extractedData = await extractCancellationsFromPdf(file);
        if (extractedData && extractedData.length > 0) {
            setCancellationList(extractedData);
            showToast(`${extractedData.length} records extracted successfully!`, 'success');
        } else {
            showToast('Could not extract any records from the PDF. Please check the document quality.', 'error');
        }
    } catch (error) {
        console.error("Cancellation PDF processing error:", error);
        showToast('An error occurred during PDF processing.', 'error');
    } finally {
        setLoadingMessage(null);
        if (e.target) e.target.value = ''; // Reset file input
    }
  };
  
  const populateFormWithCancellationData = (data: CancellationData) => {
    const dateParts = data.cancellationDate.split('/');
    const formattedDate = dateParts.length === 3
        ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
        : '';

    setFormData(prev => ({
        ...prev,
        policyHolder: data.namedInsured,
        recipientName: data.namedInsured.split(' ')[0], // Best guess for first name
        policyNumber: data.policyNumber.replace(/\s+/g, ''), // Remove spaces from policy number
        lateCancellationDate: formattedDate,
        lateAmountDue: data.amountDue,
        recipientEmail: '', // Clear email so user must enter it
    }));
    showToast(`Form populated for ${data.namedInsured}. Please add their email.`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // --- TEMPLATE MANAGEMENT ---
  const saveTemplatesToStorage = (updatedTemplates: Template[]) => {
      try {
          localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));
      } catch (error) {
          showToast('Could not save templates.', 'error');
          console.error(error);
      }
  };
  
  const handleSaveTemplate = () => {
    setNewTemplateName('');
    setClearCustomerData(true); // Default to clearing data for a reusable template
    setIsSaveModalOpen(true);
  };
  
  const handleConfirmSaveTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) {
        showToast('Please enter a template name.', 'warning');
        return;
    }

    let dataToSave: Partial<EmailFormData>;

    if (clearCustomerData) {
        // Create a cleaned copy for a reusable template
        const cleanedData: Partial<EmailFormData> = { ...formData };
        const fieldsToClear: (keyof EmailFormData)[] = [
            'policyHolder', 'recipientEmail', 'recipientName', 'policyNumber',
            'quoteAmount', 'monthlyPremium', 'coverageStart', 'quoteExpires', 'isUpdatedQuote', 'policyEffectiveDate',
            'renewalDue', 'lateCancellationDate', 'lateAmountDue', 'latePaymentLink',
            'carrierName', 'homePolicyType', 'propertyAddress', 'dwellingCoverage', 'otherStructuresCoverage',
            'personalPropertyCoverage', 'lossOfUseCoverage', 'personalLiabilityCoverage',
            'medicalPaymentsCoverage', 'deductible', 'endorsements', 'autoVehicles',
            'autoDrivers', 'autoBodilyInjury', 'autoPropertyDamage', 'autoMedicalPayments',
            'autoUninsuredMotorist', 'autoComprehensiveDeductible', 'autoCollisionDeductible',
            'autoExtraCoverages', 'itemizedCoveragesHtml',
            'receiptAmount', 'receiptDatePaid', 'receiptConfirmationNumber', 'receiptPaymentMethod'
        ];
        for (const key of fieldsToClear) {
            (cleanedData as any)[key] = INITIAL_FORM_DATA[key];
        }
        cleanedData.emailSubject = getSubjectForDocumentType(cleanedData.documentType || '', '');
        dataToSave = cleanedData;
    } else {
        // Save a complete snapshot with all data
        dataToSave = formData;
    }

    const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name,
        savedAt: Date.now(),
        data: dataToSave,
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveTemplatesToStorage(updatedTemplates);
    showToast(`Template "${name}" saved!`, 'success');

    setIsSaveModalOpen(false);
    setNewTemplateName('');
  };

  const handleLoadTemplate = (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (template) {
          // Reset fields not in template, but keep recipient email if needed
          const newFormData = { ...INITIAL_FORM_DATA, recipientEmail: formData.recipientEmail, ...template.data };
          setFormData(newFormData);
          setIsTemplatesModalOpen(false);
          showToast(`Template "${template.name}" loaded.`, 'success');
      }
  };

  const handleDeleteTemplate = (templateId: string) => {
      if (window.confirm("Are you sure you want to delete this template?")) {
          const updatedTemplates = templates.filter(t => t.id !== templateId);
          setTemplates(updatedTemplates);
          saveTemplatesToStorage(updatedTemplates);
          showToast('Template deleted.', 'success');
      }
  };

  const handleExportTemplates = () => {
    if (templates.length === 0) {
        showToast("There are no templates to export.", "warning");
        return;
    }
    const dataStr = JSON.stringify(templates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'email-templates-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast("Templates exported successfully!", "success");
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            const importedTemplates = JSON.parse(text as string) as Template[];
            
            if (!Array.isArray(importedTemplates) || (importedTemplates.length > 0 && (!importedTemplates[0].id || !importedTemplates[0].name))) {
                throw new Error("Invalid file format.");
            }

            const existingIds = new Set(templates.map(t => t.id));
            const newTemplates = importedTemplates.filter(t => !existingIds.has(t.id));

            if (newTemplates.length > 0) {
                const updatedTemplates = [...templates, ...newTemplates];
                setTemplates(updatedTemplates);
                saveTemplatesToStorage(updatedTemplates);
                showToast(`Successfully imported ${newTemplates.length} new templates.`, "success");
            } else {
                showToast("No new templates to import. All templates in the file already exist.", "info");
            }
        } catch (error) {
            showToast("Import failed. The file is either corrupted or not a valid template backup.", "error");
        } finally {
            if (importTemplatesFileInputRef.current) {
                importTemplatesFileInputRef.current.value = "";
            }
        }
    };
    reader.readAsText(file);
  };

  // --- RECIPIENT LIST MANAGEMENT ---
  const saveRecipientListsToStorage = (lists: RecipientList[]) => {
    try {
        localStorage.setItem(RECIPIENT_LISTS_STORAGE_KEY, JSON.stringify(lists));
    } catch (error) {
        showToast('Could not save recipient lists.', 'error');
        console.error(error);
    }
  };

  const handleSaveRecipientLists = (updatedLists: RecipientList[]) => {
      setRecipientLists(updatedLists);
      saveRecipientListsToStorage(updatedLists);
      showToast('Recipient lists updated!', 'success');
  };
  
  // --- ICS DOWNLOAD ---
  const handleDownloadIcs = () => {
    if (!formData.renewalDue) {
        showToast('Please set a renewal date and time first.', 'warning');
        return;
    }

    const toIcsDate = (date: Date): string => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
    };

    const escapeIcs = (text: string): string => (text || '').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

    const buildIcsContent = (title: string, startIso: string): string => {
        const startDate = new Date(startIso);
        if (isNaN(startDate.getTime())) return '';
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration
        const uid = `renewal-${Date.now()}@billlayneins.com`;

        return [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BillLayneInsurance//AIComposer//EN',
            'BEGIN:VEVENT',
            `UID:${uid}`, `DTSTAMP:${toIcsDate(new Date())}`, `DTSTART:${toIcsDate(startDate)}`, `DTEND:${toIcsDate(endDate)}`,
            `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(`Policy renewal reminder from ${AGENCY_DETAILS.name}`)}`, `LOCATION:${escapeIcs(AGENCY_DETAILS.address)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    };

    const title = `Policy Renewal: ${formData.policyHolder || 'Your Policy'}`;
    const icsContent = buildIcsContent(title, formData.renewalDue);
    if (!icsContent) {
        showToast('Invalid date format for renewal.', 'error');
        return;
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Policy-Renewal.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Calendar file (.ics) downloaded!', 'success');
  };

  const handleDownloadCampaignData = () => {
    if (!generatedHtml) {
        showToast('Please generate a preview of the template first.', 'warning');
        return;
    }
    const list = recipientLists.find(l => l.id === selectedListId);
    if (!list || list.recipients.length === 0) {
        showToast('Please select a recipient list with at least one recipient.', 'warning');
        return;
    }

    const rows = [
        ['"email"', '"firstName"', '"policyHolder"', '"subject"', '"htmlBody"'] // CSV header
    ];

    for (const recipient of list.recipients) {
        const personalizedSubject = formData.emailSubject
            .replace(/{{recipientName}}/g, recipient.firstName || '')
            .replace(/{{firstName}}/g, recipient.firstName || '')
            .replace(/{{policyHolder}}/g, recipient.policyHolder || '');
        
        const personalizedHtml = generatedHtml
            .replace(/{{recipientName}}/g, recipient.firstName || '')
            .replace(/{{firstName}}/g, recipient.firstName || '')
            .replace(/{{policyHolder}}/g, recipient.policyHolder || '');

        rows.push([
            `"${recipient.email}"`,
            `"${recipient.firstName || ''}"`,
            `"${recipient.policyHolder || ''}"`,
            `"${personalizedSubject.replace(/"/g, '""')}"`,
            `"${personalizedHtml.replace(/"/g, '""')}"`,
        ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${list.name}_campaign_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Campaign data for "${list.name}" downloaded!`, 'success');
  };

  const handleClearForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setGeneratedHtml('');
    setPreviewVisible(false);
    setSubjectSuggestions([]);
    setPreheaderSuggestions([]);
    setCancellationList([]);
    setImageGenPrompt('');
    setVideoGenPrompt('');
    setGeneratedVideoUrl(null);
    showToast('Form has been cleared.', 'info');
  };

  const handlePreviewLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const docBody = iframe.contentDocument.body;
    docBody.contentEditable = 'true';

    // Style the editable area for better UX
    docBody.style.outline = 'none';
    docBody.addEventListener('focus', () => {
        docBody.style.boxShadow = 'inset 0 0 0 2px #299eff';
    });
    
    // Use a variable to prevent multiple blur events from firing rapidly
    let blurTimeout: number;
    docBody.addEventListener('blur', () => {
        docBody.style.boxShadow = 'none';
        
        clearTimeout(blurTimeout);
        blurTimeout = window.setTimeout(() => {
            const newBodyHtml = docBody.innerHTML;
            
            setGeneratedHtml(currentHtml => {
                if (!currentHtml) return '';
                // Replace the body content while preserving the body tag and its attributes
                return currentHtml.replace(/<body[^>]*>[\s\S]*<\/body>/i, (match) => {
                    const bodyTagMatch = match.match(/<body[^>]*>/i);
                    return bodyTagMatch ? `${bodyTagMatch[0]}${newBodyHtml}</body>` : match;
                });
            });
            showToast('Preview updated with your edits.', 'info');
        }, 100);
    });
  };


  const isAiBodyType = !['Insurance Quote', 'Policy Renewal', 'Late Payment Notice', 'Receipt', 'New Policy Welcome'].includes(formData.documentType);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
      {loadingMessage && <LoadingOverlay message={loadingMessage} />}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-primary-800 dark:text-brand-primary-300 bg-clip-text text-transparent bg-gradient-to-r from-brand-primary-700 to-brand-secondary">
              AI Email Composer
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">For {AGENCY_DETAILS.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleSaveTemplate} disabled={!!loadingMessage}><IconSave /> Save Template</Button>
            <Button variant="ghost" onClick={() => setIsTemplatesModalOpen(true)} disabled={!!loadingMessage}><IconFolder /> Load Templates</Button>
            <button onClick={toggleAppDarkMode} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              {appDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-6">
            <div className='flex justify-between items-center border-b pb-3 border-gray-200 dark:border-gray-700'>
              <h2 className="text-xl font-bold">Compose Your Email</h2>
              <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button type="button" onClick={() => setComposeMode('single')} className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${composeMode === 'single' ? 'bg-brand-primary-600 text-white border-brand-primary-600' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                      Single Email
                  </button>
                  <button type="button" onClick={() => setComposeMode('bulk')} className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${composeMode === 'bulk' ? 'bg-brand-primary-600 text-white border-brand-primary-600' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                      Bulk Campaign
                  </button>
              </div>
            </div>

            <FormField label="Email Purpose" id="documentType">
              <select id="documentType" value={formData.documentType} onChange={e => { handleFormChange(e); setCancellationList([]); }} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage}>
                <option value="">-- Select a purpose --</option>
                {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </FormField>

            <FormField label="Sent From" id="agentId">
              <select id="agentId" value={formData.agentId} onChange={handleFormChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage}>
                {AGENTS.map(agent => <option key={agent.id} value={agent.id}>{agent.name} ({agent.title})</option>)}
              </select>
            </FormField>

            {composeMode === 'single' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Policy Holder Name" id="policyHolder"><input type="text" id="policyHolder" value={formData.policyHolder} onChange={handleFormChange} placeholder="e.g., John Doe" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage} /></FormField>
                  <FormField label="Recipient First Name" id="recipientName"><input type="text" id="recipientName" value={formData.recipientName} onChange={handleFormChange} placeholder="e.g., Jane" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage} /></FormField>
                  <FormField label="Recipient Email" id="recipientEmail">
                    <input type="email" id="recipientEmail" value={formData.recipientEmail} onChange={handleRecipientEmailChange} placeholder="client@example.com" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" list="recipient-emails" disabled={!!loadingMessage} />
                    <datalist id="recipient-emails">
                      {allRecipients.map(recipient => (
                          <option key={recipient.email} value={recipient.email} />
                      ))}
                    </datalist>
                  </FormField>
                  <FormField label="Tone" id="tone"><select id="tone" value={formData.tone} onChange={handleFormChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage}>{TONE_OPTIONS.map(tone => <option key={tone} value={tone}>{tone}</option>)}</select></FormField>
                </div>
            ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-4 border-2 border-blue-300/50 dark:border-blue-500/30">
                  <h3 className="text-lg font-bold text-blue-800 dark:text-blue-100">Bulk Campaign Recipients</h3>
                  <FormField label="Select Recipient List" id="recipientList">
                    <div className="flex gap-2">
                        <select id="recipientList" value={selectedListId} onChange={e => setSelectedListId(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                            <option value="">-- Select a list --</option>
                            {recipientLists.map(list => <option key={list.id} value={list.id}>{list.name} ({list.recipients.length} recipients)</option>)}
                        </select>
                        <Button variant="ghost" onClick={() => setIsListsModalOpen(true)} disabled={!!loadingMessage}><IconUsers /> Manage Lists</Button>
                    </div>
                  </FormField>
                   <p className="text-xs text-blue-700 dark:text-blue-200">
                        Use placeholders like <strong>{"{{recipientName}}"}</strong> and <strong>{"{{policyHolder}}"}</strong> in your subject and body for personalization.
                    </p>
                </div>
            )}
            
            <FormField label="Email Subject" id="emailSubject">
              <div className="flex gap-2">
                <input type="text" id="emailSubject" value={formData.emailSubject} onChange={handleFormChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage} />
                <Button variant="ghost" onClick={handleSuggestSubjects} disabled={!!loadingMessage} title="Suggest subjects with AI"><IconWand /></Button>
              </div>
              {subjectSuggestions.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{subjectSuggestions.map((s, i) => <button key={i} onClick={() => setFormData(p => ({...p, emailSubject: s}))} className="text-xs bg-brand-primary-100 dark:bg-brand-primary-900 text-brand-primary-800 dark:text-brand-primary-200 px-2 py-1 rounded-full hover:bg-brand-primary-200 dark:hover:bg-brand-primary-800">{s}</button>)}</div>}
            </FormField>

            <FormField label="Email Preheader" id="emailPreheader">
                <div className="flex gap-2">
                    <input type="text" id="emailPreheader" value={formData.emailPreheader} onChange={handleFormChange} placeholder="Optional: Appears after subject in inbox" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" disabled={!!loadingMessage} />
                    <Button variant="ghost" onClick={handleSuggestPreheaders} disabled={!!loadingMessage} title="Suggest preheaders with AI"><IconWand /></Button>
                </div>
                {preheaderSuggestions.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{preheaderSuggestions.map((p, i) => <button key={i} onClick={() => setFormData(f => ({...f, emailPreheader: p}))} className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800">{p}</button>)}</div>}
            </FormField>
            
            {formData.documentType === 'Insurance Quote' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4 border dark:border-gray-700">
                <h3 className="font-semibold">Quote Details</h3>
                <FormField label="Insurance Type" id="quoteType">
                    <select id="quoteType" value={formData.quoteType} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                      {QUOTE_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Coverage Start" id="coverageStart"><input id="coverageStart" value={formData.coverageStart} onChange={handleFormChange} type="date" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                  <FormField label="Quote Expires" id="quoteExpires"><input id="quoteExpires" value={formData.quoteExpires} onChange={handleFormChange} type="date" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
              </div>
            )}
            
            {formData.documentType === 'Insurance Quote' && formData.quoteType === 'Home' && (
              <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4 border-2 border-brand-accent/50 dark:border-brand-accent/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Detailed Homeowners Quote</h3>
                    <Button onClick={handleTriggerPdfUpload} disabled={!!loadingMessage} variant="ghost">
                        <IconUpload /> Fill from PDF
                    </Button>
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="isUpdatedQuote" name="isUpdatedQuote" checked={formData.isUpdatedQuote} onChange={handleFormChange} className="h-4 w-4 rounded border-gray-300 text-brand-primary-600 focus:ring-brand-primary-500" disabled={!!loadingMessage} />
                    <label htmlFor="isUpdatedQuote" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as an UPDATED quote</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Annual Premium" id="quoteAmount"><input id="quoteAmount" value={formData.quoteAmount} onChange={handleFormChange} type="text" placeholder="$1,072" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Monthly Premium" id="monthlyPremium"><input id="monthlyPremium" value={formData.monthlyPremium} readOnly type="text" placeholder="Auto-calculated" className="w-full p-2 border rounded-md bg-gray-200 dark:bg-gray-800 dark:border-gray-500 cursor-not-allowed" /></FormField>
                </div>
                <FormField label="Previous Annual Premium (Optional)" id="previousQuoteAmount">
                    <input id="previousQuoteAmount" value={formData.previousQuoteAmount || ''} onChange={handleFormChange} type="text" placeholder="$980" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} />
                </FormField>

                {parseFloat(formData.quoteAmount.replace(/[^0-9.]/g, '')) > parseFloat(formData.previousQuoteAmount?.replace(/[^0-9.]/g, '') || '0') && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                    {!formData.renewalRateExplanation ? (
                        <Button onClick={handleGenerateRateExplanation} disabled={!!loadingMessage} variant="ghost">
                            <IconWand /> Explain Premium Increase
                        </Button>
                      ) : (
                        <FormField label="AI-Generated Explanation (Editable)" id="renewalRateExplanation">
                        <textarea
                            id="renewalRateExplanation"
                            value={formData.renewalRateExplanation}
                            onChange={handleFormChange}
                            rows={4}
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500"
                            disabled={!!loadingMessage}
                        />
                        </FormField>
                    )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Carrier Name" id="carrierName"><input id="carrierName" value={formData.carrierName} onChange={handleFormChange} type="text" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Policy Form / Type" id="homePolicyType"><input id="homePolicyType" value={formData.homePolicyType} onChange={handleFormChange} type="text" placeholder="e.g., HO-3, Mobile Home" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <FormField label="Property Address" id="propertyAddress"><input id="propertyAddress" value={formData.propertyAddress} onChange={handleFormChange} type="text" placeholder="e.g., 285 Adams Ridge Road" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                <h4 className="font-semibold pt-2 border-t dark:border-gray-600 text-gray-700 dark:text-gray-200">Coverage Amounts</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Dwelling (A)" id="dwellingCoverage"><input id="dwellingCoverage" value={formData.dwellingCoverage} onChange={handleFormChange} type="text" placeholder="$360,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Other Structures (B)" id="otherStructuresCoverage"><input id="otherStructuresCoverage" value={formData.otherStructuresCoverage} onChange={handleFormChange} type="text" placeholder="$36,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Personal Property (C)" id="personalPropertyCoverage"><input id="personalPropertyCoverage" value={formData.personalPropertyCoverage} onChange={handleFormChange} type="text" placeholder="$180,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Loss of Use (D)" id="lossOfUseCoverage"><input id="lossOfUseCoverage" value={formData.lossOfUseCoverage} onChange={handleFormChange} type="text" placeholder="$72,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Personal Liability" id="personalLiabilityCoverage"><input id="personalLiabilityCoverage" value={formData.personalLiabilityCoverage} onChange={handleFormChange} type="text" placeholder="$300,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Medical Payments" id="medicalPaymentsCoverage"><input id="medicalPaymentsCoverage" value={formData.medicalPaymentsCoverage} onChange={handleFormChange} type="text" placeholder="$1,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <FormField label="Deductible" id="deductible"><input id="deductible" value={formData.deductible} onChange={handleFormChange} type="text" placeholder="$1,000 All Perils" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                <FormField label="Included Endorsements / Special Coverages" id="endorsements">
                    <textarea id="endorsements" value={formData.endorsements} onChange={handleFormChange} rows={4} placeholder="One per line. Title and description separated by a pipe. e.g., Water Back Up|Adds coverage up to $25,000 for..." className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}></textarea>
                </FormField>
              </div>
            )}
            
            {formData.documentType === 'Insurance Quote' && formData.quoteType === 'Auto' && (
              <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4 border-2 border-brand-accent/50 dark:border-brand-accent/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Detailed Auto Quote</h3>
                    <Button onClick={handleTriggerPdfUpload} disabled={!!loadingMessage} variant="ghost">
                        <IconUpload /> Fill from PDF
                    </Button>
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField label="Total Premium" id="quoteAmount"><input id="quoteAmount" value={formData.quoteAmount} onChange={handleFormChange} type="text" placeholder="$1,250" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Policy Term" id="policyTerm"><select id="policyTerm" value={formData.policyTerm} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}><option value="12">12 Months</option><option value="6">6 Months</option></select></FormField>
                </div>
                <FormField label="Monthly Premium" id="monthlyPremium"><input id="monthlyPremium" value={formData.monthlyPremium} readOnly type="text" placeholder="Auto-calculated" className="w-full p-2 border rounded-md bg-gray-200 dark:bg-gray-800 dark:border-gray-500 cursor-not-allowed" /></FormField>
                
                <FormField label="Previous Total Premium (Optional)" id="previousQuoteAmount">
                    <input id="previousQuoteAmount" value={formData.previousQuoteAmount || ''} onChange={handleFormChange} type="text" placeholder="$1100" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} />
                </FormField>

                {parseFloat(formData.quoteAmount.replace(/[^0-9.]/g, '')) > parseFloat(formData.previousQuoteAmount?.replace(/[^0-9.]/g, '') || '0') && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                    {!formData.renewalRateExplanation ? (
                        <Button onClick={handleGenerateRateExplanation} disabled={!!loadingMessage} variant="ghost">
                            <IconWand /> Explain Premium Increase
                        </Button>
                      ) : (
                        <FormField label="AI-Generated Explanation (Editable)" id="renewalRateExplanation">
                        <textarea
                            id="renewalRateExplanation"
                            value={formData.renewalRateExplanation}
                            onChange={handleFormChange}
                            rows={4}
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500"
                            disabled={!!loadingMessage}
                        />
                        </FormField>
                    )}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Vehicles" id="autoVehicles"><textarea id="autoVehicles" value={formData.autoVehicles} onChange={handleFormChange} rows={2} placeholder="e.g., 2023 Toyota Camry, 2021 Ford F-150" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Drivers" id="autoDrivers"><textarea id="autoDrivers" value={formData.autoDrivers} onChange={handleFormChange} rows={2} placeholder="e.g., John Doe, Jane Doe" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <h4 className="font-semibold pt-2 border-t dark:border-gray-600 text-gray-700 dark:text-gray-200">Liability Coverages</h4>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <FormField label="Bodily Injury" id="autoBodilyInjury"><input id="autoBodilyInjury" value={formData.autoBodilyInjury} onChange={handleFormChange} type="text" placeholder="100k/300k" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Property Damage" id="autoPropertyDamage"><input id="autoPropertyDamage" value={formData.autoPropertyDamage} onChange={handleFormChange} type="text" placeholder="50k" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Medical Payments" id="autoMedicalPayments"><input id="autoMedicalPayments" value={formData.autoMedicalPayments} onChange={handleFormChange} type="text" placeholder="5k" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Uninsured Motorist" id="autoUninsuredMotorist"><input id="autoUninsuredMotorist" value={formData.autoUninsuredMotorist} onChange={handleFormChange} type="text" placeholder="100k/300k" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <h4 className="font-semibold pt-2 border-t dark:border-gray-600 text-gray-700 dark:text-gray-200">Deductibles</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Comprehensive" id="autoComprehensiveDeductible"><input id="autoComprehensiveDeductible" value={formData.autoComprehensiveDeductible} onChange={handleFormChange} type="text" placeholder="$500" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Collision" id="autoCollisionDeductible"><input id="autoCollisionDeductible" value={formData.autoCollisionDeductible} onChange={handleFormChange} type="text" placeholder="$500" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <FormField label="Included Optional Coverages" id="autoExtraCoverages">
                    <textarea id="autoExtraCoverages" value={formData.autoExtraCoverages} onChange={handleFormChange} rows={3} placeholder="One per line. Title and description separated by a pipe. e.g., Roadside Assistance|24/7 towing and support..." className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}></textarea>
                </FormField>
              </div>
            )}


            {formData.documentType === 'Policy Renewal' && (
              <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4 border-2 border-brand-accent/50 dark:border-brand-accent/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Policy Renewal Details</h3>
                     <Button onClick={handleTriggerPdfUpload} disabled={!!loadingMessage} variant="ghost">
                        <IconUpload /> Fill from PDF
                    </Button>
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                </div>
                <FormField label="Renewal Type" id="renewalType">
                  <select id="renewalType" value={formData.renewalType} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                    {RENEWAL_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </FormField>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Carrier Name" id="carrierName"><input id="carrierName" value={formData.carrierName} onChange={handleFormChange} type="text" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Policy Number" id="policyNumber"><input id="policyNumber" value={formData.policyNumber} onChange={handleFormChange} type="text" placeholder="e.g., ABC123456789" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="New Total Premium" id="quoteAmount"><input id="quoteAmount" value={formData.quoteAmount} onChange={handleFormChange} type="text" placeholder="$1,310.00" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Monthly Premium" id="monthlyPremium"><input id="monthlyPremium" value={formData.monthlyPremium} readOnly type="text" placeholder="Auto-calculated" className="w-full p-2 border rounded-md bg-gray-200 dark:bg-gray-800 dark:border-gray-500 cursor-not-allowed" /></FormField>
                </div>
                <FormField label="Previous Total Premium (Optional)" id="previousQuoteAmount">
                    <input id="previousQuoteAmount" value={formData.previousQuoteAmount || ''} onChange={handleFormChange} type="text" placeholder="$1,250.00" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} />
                </FormField>

                {parseFloat(formData.quoteAmount.replace(/[^0-9.]/g, '')) > parseFloat(formData.previousQuoteAmount?.replace(/[^0-9.]/g, '') || '0') && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                    {!formData.renewalRateExplanation ? (
                        <Button onClick={handleGenerateRateExplanation} disabled={!!loadingMessage} variant="ghost">
                            <IconWand /> Explain Premium Increase
                        </Button>
                      ) : (
                        <FormField label="AI-Generated Explanation (Editable)" id="renewalRateExplanation">
                        <textarea
                            id="renewalRateExplanation"
                            value={formData.renewalRateExplanation}
                            onChange={handleFormChange}
                            rows={4}
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500"
                            disabled={!!loadingMessage}
                        />
                        </FormField>
                    )}
                    </div>
                )}
                
                <FormField label="Renewal Effective Date & Time" id="renewalDue"><input id="renewalDue" value={formData.renewalDue} onChange={handleFormChange} type="datetime-local" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                <div>
                  <Button onClick={handleDownloadIcs} variant="ghost" disabled={!!loadingMessage}>
                    <IconCalendar /> Download Calendar Invite
                  </Button>
                </div>
                
                {formData.renewalType === 'Home' && (
                  <div className="pt-4 mt-4 border-t dark:border-gray-600 space-y-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200">Home Coverage Details</h4>
                    <FormField label="Property Address" id="propertyAddress"><input id="propertyAddress" value={formData.propertyAddress} onChange={handleFormChange} type="text" placeholder="e.g., 285 Adams Ridge Road" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField label="Dwelling (A)" id="dwellingCoverage"><input id="dwellingCoverage" value={formData.dwellingCoverage} onChange={handleFormChange} type="text" placeholder="$360,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Other Structures (B)" id="otherStructuresCoverage"><input id="otherStructuresCoverage" value={formData.otherStructuresCoverage} onChange={handleFormChange} type="text" placeholder="$36,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Personal Property (C)" id="personalPropertyCoverage"><input id="personalPropertyCoverage" value={formData.personalPropertyCoverage} onChange={handleFormChange} type="text" placeholder="$180,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Loss of Use (D)" id="lossOfUseCoverage"><input id="lossOfUseCoverage" value={formData.lossOfUseCoverage} onChange={handleFormChange} type="text" placeholder="$72,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Personal Liability" id="personalLiabilityCoverage"><input id="personalLiabilityCoverage" value={formData.personalLiabilityCoverage} onChange={handleFormChange} type="text" placeholder="$300,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Medical Payments" id="medicalPaymentsCoverage"><input id="medicalPaymentsCoverage" value={formData.medicalPaymentsCoverage} onChange={handleFormChange} type="text" placeholder="$1,000" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    </div>
                    <FormField label="Deductible" id="deductible"><input id="deductible" value={formData.deductible} onChange={handleFormChange} type="text" placeholder="$1,000 All Perils" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                  </div>
                )}
                
                {formData.renewalType === 'Auto' && (
                   <div className="pt-4 mt-4 border-t dark:border-gray-600 space-y-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200">Auto Coverage Details</h4>
                    <FormField label="Policy Term" id="policyTerm"><select id="policyTerm" value={formData.policyTerm} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}><option value="12">12 Months</option><option value="6">6 Months</option></select></FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Vehicles" id="autoVehicles"><textarea id="autoVehicles" value={formData.autoVehicles} onChange={handleFormChange} rows={2} placeholder="e.g., 2023 Toyota Camry, 2021 Ford F-150" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                        <FormField label="Drivers" id="autoDrivers"><textarea id="autoDrivers" value={formData.autoDrivers} onChange={handleFormChange} rows={2} placeholder="e.g., John Doe, Jane Doe" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Note: For detailed, per-vehicle coverages, please use the "Fill from PDF" feature which uses AI to generate an itemized HTML table.</p>
                  </div>
                )}

              </div>
            )}
            
            {formData.documentType === 'New Policy Welcome' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-4 border-2 border-green-300/50 dark:border-green-500/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-100">New Policy Details</h3>
                    <Button onClick={handleTriggerPdfUpload} disabled={!!loadingMessage} variant="ghost">
                        <IconUpload /> Fill from PDF
                    </Button>
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Carrier Name" id="carrierName"><input id="carrierName" value={formData.carrierName} onChange={handleFormChange} type="text" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                    <FormField label="Policy Number" id="policyNumber"><input id="policyNumber" value={formData.policyNumber} onChange={handleFormChange} type="text" placeholder="e.g., ABC123456789" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <FormField label="Policy Effective Date" id="policyEffectiveDate"><input id="policyEffectiveDate" value={formData.policyEffectiveDate} onChange={handleFormChange} type="date" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                <FormField label="Policy Type" id="renewalType">
                  <select id="renewalType" value={formData.renewalType} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                    {RENEWAL_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </FormField>
              </div>
            )}

            {formData.documentType === 'Late Payment Notice' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-4 border-2 border-red-300/50 dark:border-red-500/30">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-100">Late Payment Notice Details</h3>
                    <Button onClick={() => cancellationPdfInputRef.current?.click()} disabled={!!loadingMessage} variant="ghost">
                        <IconUpload /> Upload Report PDF
                    </Button>
                    <input type="file" ref={cancellationPdfInputRef} onChange={handleCancellationPdfUpload} accept="application/pdf" className="hidden" />
                </div>
                {cancellationList.length > 0 && (
                  <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                    <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-200">Extracted Cancellations ({cancellationList.length})</h4>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-800 dark:text-gray-400">
                          <tr>
                            <th scope="col" className="px-4 py-2">Insured</th>
                            <th scope="col" className="px-4 py-2">Policy #</th>
                            <th scope="col" className="px-4 py-2">Cancel Date</th>
                            <th scope="col" className="px-4 py-2">Amount</th>
                            <th scope="col" className="px-4 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-600">
                          {cancellationList.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                              <td className="px-4 py-2 font-medium">{item.namedInsured}</td>
                              <td className="px-4 py-2 font-mono">{item.policyNumber}</td>
                              <td className="px-4 py-2">{item.cancellationDate}</td>
                              <td className="px-4 py-2 font-semibold">{item.amountDue}</td>
                              <td className="px-4 py-2"><Button variant="secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => populateFormWithCancellationData(item)}>Use</Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Insurance Company" id="carrierName">
                      <select id="carrierName" value={formData.carrierName} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                        {LATE_PAYMENT_CARRIERS.map(carrier => (
                          <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Policy Number" id="policyNumber"><input id="policyNumber" value={formData.policyNumber} onChange={handleFormChange} type="text" placeholder="e.g., 123456789" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Policy Type" id="latePolicyType">
                      <select id="latePolicyType" value={formData.latePolicyType} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                        <option>Auto</option>
                        <option>Home</option>
                        <option>Commercial</option>
                        <option>Other</option>
                      </select>
                    </FormField>
                    <FormField label="Amount Due" id="lateAmountDue"><input id="lateAmountDue" value={formData.lateAmountDue} onChange={handleFormChange} type="text" placeholder="$123.45" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                <FormField label="Cancellation Date" id="lateCancellationDate"><input id="lateCancellationDate" value={formData.lateCancellationDate} onChange={handleFormChange} type="date" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
              </div>
            )}

            {formData.documentType === 'Receipt' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-4 border-2 border-green-300/50 dark:border-green-500/30">
                 <h3 className="text-lg font-bold text-green-800 dark:text-green-100">Receipt Details</h3>
                 <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm text-green-900 dark:text-green-200">AI Receipt Helper</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => receiptPdfInputRef.current?.click()} disabled={!!loadingMessage} variant="ghost" className="w-full"><IconUpload /> Fill from PDF Receipt</Button>
                        <input type="file" ref={receiptPdfInputRef} onChange={handleReceiptPdfUpload} accept="application/pdf" className="hidden" />
                    </div>
                    <div className="flex items-center gap-2"><div className="flex-grow border-t border-green-200 dark:border-green-700"></div><span className="text-xs font-semibold text-green-700 dark:text-green-300">OR</span><div className="flex-grow border-t border-green-200 dark:border-green-700"></div></div>
                    <textarea value={pastedReceiptText} onChange={e => setPastedReceiptText(e.target.value)} rows={4} placeholder="Paste receipt text here (from an email, etc.)" className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500 text-sm"></textarea>
                    <Button onClick={handleAnalyzePastedReceipt} disabled={!pastedReceiptText.trim() || !!loadingMessage} variant="ghost" className="w-full"><IconWand /> Analyze Pasted Text</Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Insurance Company" id="carrierName">
                      <select id="carrierName" value={formData.carrierName} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                        {LATE_PAYMENT_CARRIERS.map(carrier => (
                          <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Policy Number" id="policyNumber"><input id="policyNumber" value={formData.policyNumber} onChange={handleFormChange} type="text" placeholder="e.g., 123456789" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField label="Amount Paid" id="receiptAmount"><input id="receiptAmount" value={formData.receiptAmount} onChange={handleFormChange} type="text" placeholder="$123.45" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                     <FormField label="Date Paid" id="receiptDatePaid"><input id="receiptDatePaid" value={formData.receiptDatePaid} onChange={handleFormChange} type="date" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField label="Confirmation Number" id="receiptConfirmationNumber"><input id="receiptConfirmationNumber" value={formData.receiptConfirmationNumber} onChange={handleFormChange} type="text" placeholder="e.g., ABC123XYZ" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                     <FormField label="Payment Method" id="receiptPaymentMethod"><input id="receiptPaymentMethod" value={formData.receiptPaymentMethod} onChange={handleFormChange} type="text" placeholder="e.g., Visa **** 1234" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} /></FormField>
                </div>
                 <FormField label="Product" id="receiptProduct">
                      <select id="receiptProduct" value={formData.receiptProduct} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                        {RECEIPT_PRODUCT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                 </FormField>
              </div>
            )}

            {formData.documentType === 'Change / Underwriting Request' && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-4 border-2 border-purple-300/50 dark:border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-800 dark:text-purple-100">Change / Underwriting Request</h3>
                
                <FormField label="Type of Communication" id="changeRequestType">
                  <select id="changeRequestType" value={formData.changeRequestType} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}>
                    <option value="request">Change Request (to company)</option>
                    <option value="confirmation">Confirmation (to customer)</option>
                  </select>
                </FormField>

                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-200">AI Text Helper</h4>
                    <textarea value={pastedChangeRequestText} onChange={e => setPastedChangeRequestText(e.target.value)} rows={4} placeholder="Paste an email or notes about the change here..." className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500 text-sm"></textarea>
                    <Button onClick={handleAnalyzePastedChangeRequest} disabled={!pastedChangeRequestText.trim() || !!loadingMessage} variant="ghost" className="w-full"><IconWand /> Analyze Pasted Text</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Insurance Company" id="carrierName">
                    <input id="carrierName" value={formData.carrierName} onChange={handleFormChange} type="text" placeholder="e.g., Nationwide" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} />
                  </FormField>
                  <FormField label="Policy Number" id="policyNumber">
                    <input id="policyNumber" value={formData.policyNumber} onChange={handleFormChange} type="text" placeholder="e.g., 123456789" className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage} />
                  </FormField>
                </div>
              </div>
            )}

            {isAiBodyType && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 border dark:border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Prompt for Email Body</label>
                        {['AI Prompt', 'Custom Message', 'Auto Documentation', 'Home Documentation', 'Commercial Documentation', 'General Documentation', 'Change / Underwriting Request'].includes(formData.documentType) && (
                            <>
                                <Button onClick={() => aiPromptPdfInputRef.current?.click()} disabled={!!loadingMessage} variant="ghost">
                                    <IconUpload /> Fill from PDF
                                </Button>
                                <input type="file" ref={aiPromptPdfInputRef} onChange={handleAiPromptPdfUpload} accept="application/pdf" className="hidden" />
                            </>
                        )}
                    </div>
                    <textarea id="customPrompt" value={formData.customPrompt} onChange={handleFormChange} rows={4} placeholder="e.g., Announce our new referral program. Clients get a $25 gift card for each referral..." className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500" disabled={!!loadingMessage}></textarea>
                </div>
            )}
            
            <details className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                <summary className="font-semibold cursor-pointer">Optional: Hero Image</summary>
                <div className="mt-4 divide-y dark:divide-gray-600"><div className="space-y-4 pb-4"><FormField label="Image URL" id="heroUrl"><input id="heroUrl" type="text" placeholder="https://..." value={formData.heroUrl} onChange={handleFormChange} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" /></FormField><FormField label="Upload Image" id="heroFile"><input id="heroFile" type="file" accept="image/*" onChange={handleHeroFileChange} className="w-full text-sm" /></FormField>{formData.heroUrl && <img src={formData.heroUrl} alt="Hero preview" className="rounded-md max-h-40 w-auto" />}</div><div className="pt-4 space-y-2"><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Generate with AI</h4><FormField label="Image Prompt" id="imageGenPrompt"><textarea id="imageGenPrompt" value={imageGenPrompt} onChange={(e) => setImageGenPrompt(e.target.value)} rows={2} placeholder="e.g., A family smiling in front of a new car" className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500"></textarea></FormField><Button onClick={handleGenerateImage} disabled={!!loadingMessage} variant="ghost"><IconWand /> Generate Image</Button><p className="text-xs text-gray-500 dark:text-gray-400 mt-2"><strong>Note:</strong> AI-generated images are embedded directly and significantly increase email size, which may cause Gmail to clip it.</p></div></div>
            </details>

            <details className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                <summary className="font-semibold cursor-pointer">Optional: AI Video Generation</summary>
                <div className="mt-4 space-y-4">
                    <FormField label="Video Player Page URL" id="videoPlayerUrl">
                        <input id="videoPlayerUrl" type="url" placeholder="https://your-agency.github.io/player.html" value={videoPlayerUrl} onChange={e => {
                            const url = e.target.value;
                            setVideoPlayerUrl(url);
                            localStorage.setItem('videoPlayerUrl_v1', url);
                        }} className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Host the provided `player.html` file on a service like GitHub Pages and paste the URL here.</p>
                    </FormField>
                     <FormField label="Video Prompt" id="videoGenPrompt">
                        <textarea id="videoGenPrompt" value={videoGenPrompt} onChange={(e) => setVideoGenPrompt(e.target.value)} rows={3} placeholder="e.g., A cinematic shot of a classic car driving on a scenic mountain road at sunset." className="w-full p-2 border rounded-md bg-white dark:bg-gray-600 dark:border-gray-500"></textarea>
                    </FormField>
                    <Button onClick={handleGenerateVideo} disabled={!!loadingMessage} variant="secondary">
                        <IconVideo /> Generate Video
                    </Button>
                    {generatedVideoUrl && (
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Generated Video Preview:</h4>
                            <video src={generatedVideoUrl} controls muted className="w-full rounded-lg" />
                        </div>
                    )}
                </div>
            </details>

            <div className="flex flex-wrap gap-3 pt-4 border-t dark:border-gray-700">
              {needsAiButton ? (<Button onClick={handleGenerateAndPreview} disabled={!!loadingMessage} variant="secondary"><IconWand /> Generate with AI</Button>) : (<Button onClick={handleGenerateAndPreview} disabled={!!loadingMessage}><IconEye /> Preview</Button>)}
               {composeMode === 'single' ? (
                <>
                    <Button onClick={handleOpenGmail} disabled={!generatedHtml || !!loadingMessage}><IconMail /> Open in Gmail</Button>
                    <Button onClick={handleDownloadHtml} disabled={!generatedHtml || !!loadingMessage} variant="secondary"><IconDownload /> Download HTML</Button>
                </>
               ) : (
                <Button onClick={handleDownloadCampaignData} disabled={!generatedHtml || !!loadingMessage} variant='secondary'><IconDownload /> Download Campaign Data</Button>
               )}
               <Button onClick={handleClearForm} variant="ghost" disabled={!!loadingMessage}><IconRefresh /> Clear Form</Button>
            </div>
            
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-2xl shadow-lg flex flex-col h-full">
              {previewVisible ? (
                  <>
                    <div className="flex items-center justify-between p-2 border-b dark:border-gray-700 mb-2 flex-shrink-0">
                        <h3 className="font-semibold text-sm">Preview <span className="text-xs font-normal text-gray-400">(Click text below to edit)</span></h3>
                        <div className="flex items-center gap-4">
                            <div className={`text-xs font-mono p-1 rounded ${emailSize > 102 ? 'text-red-600 bg-red-100 dark:text-red-200 dark:bg-red-900/50' : emailSize > 80 ? 'text-amber-600 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/50' : 'text-gray-500 dark:text-gray-400'}`}>
                                {emailSize.toFixed(1)} KB / 102 KB
                            </div>
                            <Button variant="ghost" onClick={() => setPreviewDarkMode(p => !p)}>
                                {previewDarkMode ? '☀️' : '🌙'} Dark Mode
                            </Button>
                        </div>
                    </div>
                    <iframe ref={iframeRef} onLoad={handlePreviewLoad} id="previewFrame" title="Email Preview" className="w-full flex-1 border rounded-lg bg-white" srcDoc={generatedHtml}></iframe>
                  </>
              ) : (
                  <div className="w-full flex-1 min-h-[600px] border rounded-lg bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center text-center p-4"><IconEye /><h3 className="text-lg font-semibold mt-4">Email Preview</h3><p className="text-gray-500 dark:text-gray-400 text-sm">Your generated email will appear here.</p></div>
              )}
          </div>
        </div>

        {/* Templates Modal */}
        {isTemplatesModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setIsTemplatesModalOpen(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold">Your Saved Templates</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={handleExportTemplates}><IconDownload /> Export All</Button>
                            <Button variant="ghost" onClick={() => importTemplatesFileInputRef.current?.click()}><IconUpload /> Import from File</Button>
                            <input type="file" ref={importTemplatesFileInputRef} accept=".json" onChange={handleImportTemplates} className="hidden" />
                            <button onClick={() => setIsTemplatesModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><IconX /></button>
                        </div>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                        {templates.length > 0 ? templates.sort((a,b) => b.savedAt - a.savedAt).map(template => (
                            <div key={template.id} className="p-3 border dark:border-gray-700 rounded-md flex justify-between items-center gap-3">
                                <div>
                                    <p className="font-semibold">{template.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Saved on {new Date(template.savedAt).toLocaleDateString()} - Type: {template.data.documentType || 'N/A'}</p>
                                </div>
                                <div className="flex-shrink-0 flex gap-2">
                                    <Button variant="primary" onClick={() => handleLoadTemplate(template.id)}>Load</Button>
                                    <Button variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">You haven't saved any templates yet.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Save Template Modal */}
        {isSaveModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsSaveModalOpen(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b dark:border-gray-700">
                        <h2 className="text-lg font-bold">Save Template</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <FormField label="Template Name" id="newTemplateName">
                            <input
                                type="text"
                                id="newTemplateName"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g., Monthly Newsletter"
                                autoFocus
                            />
                        </FormField>
                        <div className="flex items-center gap-2">
                           <input
                                type="checkbox"
                                id="clearCustomerData"
                                checked={clearCustomerData}
                                onChange={(e) => setClearCustomerData(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-primary-600 focus:ring-brand-primary-500"
                            />
                            <label htmlFor="clearCustomerData" className="text-sm text-gray-600 dark:text-gray-300">
                                Clear customer-specific data (save as a reusable template)
                            </label>
                        </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400">
                           Checking this box will clear names, emails, and quote details, making it a perfect reusable template. Uncheck to save a complete snapshot.
                         </p>
                    </div>
                    <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleConfirmSaveTemplate}>Save Template</Button>
                    </div>
                </div>
            </div>
        )}

        {isListsModalOpen && (
            <RecipientListsModal
                isOpen={isListsModalOpen}
                onClose={() => setIsListsModalOpen(false)}
                lists={recipientLists}
                onSave={handleSaveRecipientLists}
                showToast={showToast}
            />
        )}

        {/* Toast Container */}
        <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"><div className="w-full flex flex-col items-center space-y-4 sm:items-end">{toasts.map(toast => (<div key={toast.id} className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${toast.type === 'success' && 'bg-green-500'} ${toast.type === 'error' && 'bg-red-500'} ${toast.type === 'info' && 'bg-blue-500'} ${toast.type === 'warning' && 'bg-yellow-500'} text-white`}><div className="p-4"><p className="text-sm font-medium">{toast.message}</p></div></div>))}</div></div>
      </main>
    </div>
  );
}
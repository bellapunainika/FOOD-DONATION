import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface VerificationProps {
  user: UserProfile;
  onDocumentUpload: (docType: string, file: File) => Promise<string>;
  isLoading?: boolean;
}

export default function Verification({ user, onDocumentUpload, isLoading = false }: VerificationProps) {
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const isVerified = !!user.idProofUrl;

  const handleFileUpload = async (docType: 'id', fileInput: React.RefObject<HTMLInputElement | null>) => {
    if (!fileInput.current?.files?.[0]) return;
    try {
      setUploadingDoc(docType);
      await onDocumentUpload(docType, fileInput.current.files[0]);
      toast.success(`${docType === 'id' ? 'ID' : 'Certificate'} uploaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-2xl border-2 p-6 ${isVerified ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'}`}>
        <div className="flex items-center gap-4">
          {isVerified ? (
            <>
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={32} />
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300">Account Verified</h3>
                <p className="text-green-700 dark:text-green-400 text-sm mt-1">Your identity has been verified. You can now fully use the platform.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={32} />
              <div>
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-300">Verification Pending</h3>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">Upload your ID proof to verify your account and unlock all features.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ID Proof card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="text-brand-600 dark:text-brand-400" size={24} /> ID Proof
        </h3>

        {user.idProofUrl ? (
          <div className="mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">ID Verified</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded on {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <a href={user.idProofUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">
                View
              </a>
            </div>
          </div>
        ) : (
          <div
            onClick={() => idFileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-brand-500 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors cursor-pointer"
          >
            <Upload className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={32} />
            <p className="font-semibold text-gray-900 dark:text-white">Upload ID Proof</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Accepted: Aadhar, Passport, Driving License</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">Click or drag to upload (PDF, JPG, PNG)</p>
          </div>
        )}

        <input
          ref={idFileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={() => handleFileUpload('id', idFileInputRef)}
          className="hidden"
          disabled={isLoading || uploadingDoc === 'id'}
        />

        {uploadingDoc === 'id' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-200 dark:border-blue-700">
            Uploading ID proof…
          </div>
        )}
      </div>

      {/* Why Verification info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-6 transition-colors duration-300">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Why Verification?</h4>
        <ul className="space-y-2 text-blue-800 dark:text-blue-300 text-sm">
          {[
            'Build trust within our community',
            'Help organizations prioritize verified donors',
            'Prevent misuse and ensure food safety',
            'Access priority features and premium options',
          ].map(item => (
            <li key={item} className="flex gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

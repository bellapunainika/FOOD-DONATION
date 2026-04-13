import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface VerificationProps {
  user: UserProfile;
  onDocumentUpload: (docType: string, file: File) => Promise<string>;
  isLoading?: boolean;
}

export default function Verification({
  user,
  onDocumentUpload,
  isLoading = false,
}: VerificationProps) {
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const handleFileUpload = async (
    docType: 'id',
    fileInput: React.RefObject<HTMLInputElement | null>
  ) => {
    if (!fileInput.current?.files?.[0]) return;

    const file = fileInput.current.files[0];

    try {
      setUploadingDoc(docType);
      await onDocumentUpload(docType, file);
      toast.success(`${docType === 'id' ? 'ID' : 'Certificate'} uploaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const isVerified = !!user.idProofUrl;

  return (
    <div className="space-y-6">
      {/* Verification Status */}
      <div
        className={`rounded-2xl border-2 p-6 ${
          isVerified
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="flex items-center gap-4">
          {isVerified ? (
            <>
              <CheckCircle
                className="text-green-600 flex-shrink-0"
                size={32}
              />
              <div>
                <h3 className="text-lg font-bold text-green-900">
                  Account Verified
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  Your identity has been verified. You can now fully use the platform.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle
                className="text-yellow-600 flex-shrink-0"
                size={32}
              />
              <div>
                <h3 className="text-lg font-bold text-yellow-900">
                  Verification Pending
                </h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Upload your ID proof to verify your account and unlock all features.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ID Proof Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="text-brand-600" size={24} />
          ID Proof
        </h3>

        {user.idProofUrl ? (
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">ID Verified</p>
                  <p className="text-sm text-gray-600">
                    Uploaded on{' '}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <a
                href={user.idProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                View
              </a>
            </div>
          </div>
        ) : (
          <div
            onClick={() => idFileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
          >
            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="font-semibold text-gray-900">Upload ID Proof</p>
            <p className="text-gray-600 text-sm mt-1">
              Accepted: Aadhar, Passport, Driving License
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Click or drag to upload (PDF, JPG, PNG)
            </p>
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
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Uploading ID proof...
          </div>
        )}
      </div>

      {/* Verification Info Box */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h4 className="font-semibold text-blue-900 mb-3">Why Verification?</h4>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Build trust within our community</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Help organizations prioritize verified donors</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Prevent misuse and ensure food safety</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Access priority features and premium options</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

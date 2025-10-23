import React from 'react';

interface SettingsModalProps {
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-[#272a33] rounded-lg shadow-lg p-6 w-full max-w-lg text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
            <p>Editor and game settings will be available here in a future update.</p>
            <button onClick={onClose} className="mt-6 w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md">
                Close
            </button>
        </div>
    </div>
);

export default SettingsModal;
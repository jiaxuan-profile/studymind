// src/features/review/components/ResumeSessionDialog.tsx
import React from 'react';
import Dialog from '../../../components/Dialog'; // Assuming Dialog is a general component

interface ResumeSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  sessionDate: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ResumeSessionDialog: React.FC<ResumeSessionDialogProps> = ({
  isOpen,
  onClose,
  sessionName,
  sessionDate,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Resume Previous Session"
      message={`You have an unfinished review session "${sessionName}" from ${sessionDate}. Would you like to resume it or start a new session?`}
      onConfirm={onConfirm}
      confirmText={isLoading ? 'Resuming...' : 'Resume Session'}
      onCancel={onCancel} // This should trigger starting a new session (i.e. just closing dialog and letting setup proceed)
      cancelText="Start New Session"
      loading={isLoading}
      variant="default"
    />
  );
};

export default ResumeSessionDialog;
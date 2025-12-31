PaymentModal is used from PDV.tsx via open/onOpenChange and returns payments through onConfirm.
We keep legacy finalize dialog for now; Finalize button is disabled while remaining>0 when multiple payments are present.

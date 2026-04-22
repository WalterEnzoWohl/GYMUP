import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProgramSelectionScreen } from '@/features/routines/components/ProgramSelectionScreen';

export default function ProgramTemplatesPage() {
  const navigate = useNavigate();

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)]"
      type="button"
      aria-label="Volver"
    >
      <ArrowLeft size={17} className="text-[#00C9A7]" />
    </button>
  );

  return <ProgramSelectionScreen leftContent={backButton} />;
}

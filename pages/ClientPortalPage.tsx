import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseAnon } from '../services/supabaseClient'; 
import { Agency, Project, ContentPiece, ProjectStatus } from '../types';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Check, MessageSquare } from 'lucide-react';

// Componente para Peça de Conteúdo Estático
const StaticPieceCard: React.FC<{
    piece: ContentPiece;
    onApprove: (pieceId: string) => void;
    onFeedback: (piece: ContentPiece) => void;
}> = ({ piece, onApprove, onFeedback }) => (
    <div className="glass-panel rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-grow">
                <h2 className="text-xl font-bold text-white">{piece.title}</h2>
                <p className="text-gray-300 mt-1">{piece.subtitle}</p>
                <p className="text-lg text-[var(--btn-grad-from)] mt-1">{piece.cta}</p>
                {piece.finalArtUrl ? (
                    <div className="mt-4">
                        <p className="font-semibold mb-2">Arte Final:</p>
                        <a href={piece.finalArtUrl} target="_blank" rel="noopener noreferrer">
                            <img src={piece.finalArtUrl} alt="Arte Final" className="max-w-xs rounded-lg shadow-lg hover:opacity-80 transition-opacity" />
                        </a>
                    </div>
                ) : (
                    <div className="mt-4 p-4 text-center bg-black/20 rounded-lg"><p className="text-gray-400">Arte final pendente.</p></div>
                )}
                <div className="mt-4">
                    <p className="font-semibold mb-2">Legenda:</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{piece.caption}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0 flex-shrink-0 self-start">
                {piece.status === 'approved' ? (
                    <span className="flex items-center text-green-400 font-semibold p-2 bg-green-500/10 rounded-md"><Check className="mr-2"/> Aprovado</span>
                ) : (
                    <>
                        <Button variant="secondary" size="sm" onClick={() => onFeedback(piece)}><MessageSquare size={16} className="mr-2"/>{piece.status === 'adjust' ? 'Editar Feedback' : 'Solicitar Ajuste'}</Button>
                        <Button size="sm" onClick={() => onApprove(piece.id)}><Check size={16} className="mr-2"/>Aprovar</Button>
                    </>
                )}
            </div>
        </div>
        {piece.status === 'adjust' && piece.feedback && (
            <div className="mt-4 p-3 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-300 rounded-r-md">
                <strong>Feedback Solicitado:</strong> {piece.feedback}
            </div>
        )}
    </div>
);

// Novo Componente para Grupo de Carrossel
const CarouselGroupCard: React.FC<{
    groupName: string;
    slides: ContentPiece[];
    onApprove: (slides: ContentPiece[]) => void;
    onFeedback: (slides: ContentPiece[]) => void;
}> = ({ groupName, slides, onApprove, onFeedback }) => {
    const representativeImage = slides[0]?.finalArtUrl;
    const mainCaption = slides[0]?.caption;
    const firstSlideStatus = slides[0]?.status;
    const feedback = slides[0]?.feedback;
    const isApproved = slides.every(s => s.status === 'approved');
    const needsAdjust = slides.some(s => s.status === 'adjust');

    return (
        <div className="glass-panel rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-grow">
                    <h2 className="text-xl font-bold text-white">{groupName}</h2>
                    {representativeImage ? (
                        <div className="mt-4">
                            <p className="font-semibold mb-2">Apresentação Final:</p>
                            <a href={representativeImage} target="_blank" rel="noopener noreferrer">
                                <img src={representativeImage} alt="Arte Final do Carrossel" className="max-w-xs rounded-lg shadow-lg hover:opacity-80 transition-opacity" />
                            </a>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 text-center bg-black/20 rounded-lg"><p className="text-gray-400">Arte final pendente.</p></div>
                    )}
                    {mainCaption && (
                        <div className="mt-4">
                            <p className="font-semibold mb-2">Legenda Principal:</p>
                            <p className="text-gray-300 whitespace-pre-wrap">{mainCaption}</p>
                        </div>
                    )}
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        <p className="font-semibold">Roteiro do Carrossel:</p>
                        {slides.map((slide, index) => (
                            <div key={slide.id} className="pl-4 border-l-2 border-white/10">
                                <p className="font-bold text-gray-200">{index + 1}. {slide.title}</p>
                                <p className="text-sm text-gray-400">{slide.subtitle}</p>
                                {index === slides.length - 1 && slide.cta && <p className="text-sm text-[var(--btn-grad-from)] mt-1">{slide.cta}</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-4 sm:mt-0 flex-shrink-0 self-start">
                    {isApproved ? (
                         <span className="flex items-center text-green-400 font-semibold p-2 bg-green-500/10 rounded-md"><Check className="mr-2"/> Aprovado</span>
                    ) : (
                        <>
                            <Button variant="secondary" size="sm" onClick={() => onFeedback(slides)}><MessageSquare size={16} className="mr-2"/>{needsAdjust ? 'Editar Feedback' : 'Solicitar Ajuste'}</Button>
                            <Button size="sm" onClick={() => onApprove(slides)}><Check size={16} className="mr-2"/>Aprovar</Button>
                        </>
                    )}
                </div>
            </div>
             {needsAdjust && feedback && (
                <div className="mt-4 p-3 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-300 rounded-r-md">
                    <strong>Feedback Solicitado:</strong> {feedback}
                </div>
            )}
        </div>
    );
};


const ClientPortalPage: React.FC = () => {
  const { agencyId, projectId } = useParams<{ agencyId: string, projectId: string }>();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentPiecesForFeedback, setCurrentPiecesForFeedback] = useState<ContentPiece[] | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!agencyId || !projectId) {
        setError("URL inválida.");
        setLoading(false);
        return;
      }
      try {
        const projectPromise = supabaseAnon.from('projects').select('*').eq('id_agencia', Number(agencyId)).eq('id', Number(projectId)).single();
        const agencyPromise = supabaseAnon.from('agencies').select('id, name, brandName, brandLogo').eq('id', Number(agencyId)).single();

        const [projectResult, agencyResult] = await Promise.all([projectPromise, agencyPromise]);

        if (projectResult.error) throw projectResult.error;
        if (agencyResult.error) throw agencyResult.error;
        if (!projectResult.data || !agencyResult.data) throw new Error("Projeto ou agência não encontrados.");

        setProject(projectResult.data as Project);
        setAgency(agencyResult.data as Agency);
        
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os dados do projeto.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agencyId, projectId]);

  const updatePieceStatus = async (piecesToUpdate: ContentPiece[], status: 'approved' | 'adjust', feedback?: string) => {
    if (!project || !agencyId || !projectId) return;

    const originalProject = JSON.parse(JSON.stringify(project));
    const pieceIdsToUpdate = new Set(piecesToUpdate.map(p => p.id));

    // Update Otimista da UI
    const optimisticallyUpdatePieces = (pieceArray: ContentPiece[] | undefined) =>
        pieceArray?.map(p => {
            if (pieceIdsToUpdate.has(p.id)) {
                const updatedPiece = { ...p, status };
                if (status === 'adjust' && p.id === piecesToUpdate[0].id) { // Aplica feedback apenas na primeira peça do grupo
                    updatedPiece.feedback = feedback;
                } else if (status === 'approved') {
                    delete updatedPiece.feedback;
                }
                return updatedPiece;
            }
            return p;
        });
    
    const updatedStatic = optimisticallyUpdatePieces(project.pecas_conteudo);
    const updatedCarousel = optimisticallyUpdatePieces(project.pecas_carrossel);

    const updatedProjectState = { ...project, pecas_conteudo: updatedStatic!, pecas_carrossel: updatedCarousel };
    if (status === 'adjust') {
        updatedProjectState.status = ProjectStatus.Adjustments;
    }
    setProject(updatedProjectState);

    try {
        const updatePromises = piecesToUpdate.map((piece, index) => {
             const pieceFeedback = (status === 'adjust' && index === 0) ? feedback : undefined;
             return supabaseAnon.rpc('update_project_from_portal', {
                p_agency_id: Number(agencyId),
                p_project_id: Number(projectId),
                p_piece_id: piece.id,
                p_new_status: status,
                p_feedback_text: pieceFeedback,
            });
        });
        
        const results = await Promise.all(updatePromises);
        results.forEach(result => {
             if (result.error) throw result.error;
             if (result.data && result.data.error) throw new Error(result.data.error);
        });

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
        console.error("RPC Error:", e);
        alert(`Ocorreu um erro ao atualizar: ${errorMessage}\n\nTente novamente.`);
        setProject(originalProject);
    }
  };

  const handleOpenFeedbackModal = (pieces: ContentPiece[]) => {
      setCurrentPiecesForFeedback(pieces);
      setFeedbackText(pieces[0].feedback || '');
      setFeedbackModalOpen(true);
  }

  const handleSendFeedback = async () => {
      if(!currentPiecesForFeedback) return;
      await updatePieceStatus(currentPiecesForFeedback, 'adjust', feedbackText);
      setFeedbackModalOpen(false);
      setCurrentPiecesForFeedback(null);
      setFeedbackText('');
  }

  const groupedCarousels = useMemo(() => {
    if (!project?.pecas_carrossel) return {};
    return project.pecas_carrossel.reduce((acc, piece) => {
        const match = piece.title.match(/^(Carrossel\s*\d+):?/i);
        const groupName = match ? match[1].trim() : 'Carrossel';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(piece);
        return acc;
    }, {} as Record<string, ContentPiece[]>);
  }, [project]);


  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  if (!project || !agency) return <div className="flex h-screen items-center justify-center text-white">Projeto não encontrado.</div>;

  return (
    <div className="min-h-screen text-white p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold">{project.nome}</h1>
          <p className="text-gray-400">Cliente: {project.cliente}</p>
        </div>
        <div className="flex items-center mt-4 sm:mt-0">
          {agency.brandLogo && <img src={agency.brandLogo} alt="Logo" className="h-10 mr-4" />}
          <span className="text-xl font-semibold">{agency.brandName || agency.name}</span>
        </div>
      </header>
      
      <main className="space-y-6">
        {project.pecas_conteudo.map(piece => (
          <StaticPieceCard 
            key={piece.id}
            piece={piece}
            onApprove={(pieceId) => updatePieceStatus([piece], 'approved')}
            onFeedback={(p) => handleOpenFeedbackModal([p])}
          />
        ))}
        
        {Object.entries(groupedCarousels).length > 0 && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mt-8 pt-4 border-t border-white/10">Carrosséis</h2>
                {Object.entries(groupedCarousels).map(([groupName, slides]) => (
                    <CarouselGroupCard 
                        key={groupName}
                        groupName={groupName}
                        slides={slides}
                        onApprove={(s) => updatePieceStatus(s, 'approved')}
                        onFeedback={(s) => handleOpenFeedbackModal(s)}
                    />
                ))}
            </div>
        )}
      </main>

      <footer className="text-center mt-12 text-gray-600">
        <p className="flex items-center justify-center"><span>Portal fornecido por&nbsp;</span><img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-5 w-auto" /></p>
      </footer>
      
      <Modal isOpen={isFeedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} title={`Feedback para: ${currentPiecesForFeedback && currentPiecesForFeedback.length > 1 ? currentPiecesForFeedback[0].title.split(':')[0] : currentPiecesForFeedback?.[0].title}`}>
          <div className="space-y-4">
              <p className="text-gray-300">Por favor, descreva os ajustes necessários.</p>
              <textarea 
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                rows={5}
                className="w-full bg-white/5 border border-white/10 text-white rounded-md p-2 focus:ring-2 focus:ring-[var(--btn-grad-to)]"
              />
              <div className="flex justify-end">
                <Button onClick={handleSendFeedback}>Enviar Feedback</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ClientPortalPage;
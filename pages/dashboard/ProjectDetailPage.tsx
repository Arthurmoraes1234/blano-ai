import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Project, ContentPiece } from '../../types';
import Header from '../../components/Header';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import { storageService } from '../../services/storageService';
import { geminiService } from '../../services/geminiService'; // Import Gemini service
import { UploadCloud, CheckCircle, AlertCircle, Edit, Clipboard, Eye, Replace, Save, Image as ImageIcon, ExternalLink, Clock, Tag, Layers, Sparkles, Trash2, Info } from 'lucide-react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Fix: Created a specific type for AI commands to simplify type inference.
type AiAssistantCommand = 'variations' | 'shorten' | 'impact' | 'rewrite_fun' | 'rewrite_formal' | 'add_hashtags';

// Novo componente para o botão e menu do assistente de IA
const AiAssistantMenu: React.FC<{
    onSelect: (command: AiAssistantCommand) => void;
    fieldType: 'title' | 'caption' | 'subtitle';
}> = ({ onSelect, fieldType }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const commonOptions = [
        { label: 'Gerar Variações', command: 'variations' as const },
        { label: 'Tornar mais Curto', command: 'shorten' as const },
        { label: 'Tornar mais Impactante', command: 'impact' as const },
        { label: 'Reescrever (Divertido)', command: 'rewrite_fun' as const },
        { label: 'Reescrever (Formal)', command: 'rewrite_formal' as const },
    ];
    const captionOptions = [
        ...commonOptions,
        { label: 'Adicionar Hashtags', command: 'add_hashtags' as const },
    ];

    const options = fieldType === 'caption' ? captionOptions : commonOptions;

    return (
        <div className="relative" ref={menuRef}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Assistente de IA"
            >
                <Sparkles size={16} className="text-[var(--btn-grad-from)]" />
            </Button>
            {isOpen && (
                <div className="absolute z-20 right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-md shadow-lg animate-fadeIn">
                    <ul className="py-1">
                        {options.map(opt => (
                            <li key={opt.command}>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                                    onClick={() => {
                                        onSelect(opt.command);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const ContentPieceCard: React.FC<{
    piece: ContentPiece;
    project: Project;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, pieceId: string) => void;
    onEdit: (piece: ContentPiece) => void;
    onViewImage: (url: string) => void;
    uploading: boolean;
}> = ({ piece, onFileUpload, onEdit, onViewImage, uploading }) => {
    return (
        <div className="bg-white/5 p-4 rounded-md">
            <div className="flex justify-between items-start">
            <div className="flex-1">
                <h4 className="font-bold text-white">{piece.title}</h4>
                <p className="text-gray-300 text-md mt-1">{piece.subtitle}</p>
                <p className="text-sm font-medium text-[var(--btn-grad-from)] mt-1">{piece.cta}</p>
            </div>
            <div className="flex items-center space-x-2">
                <div className={`flex items-center px-3 py-1 text-xs rounded-full ${
                piece.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                piece.status === 'adjust' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-gray-300'
                }`}>
                {piece.status === 'approved' && <CheckCircle size={14} className="mr-1"/>}
                {piece.status === 'adjust' && <AlertCircle size={14} className="mr-1"/>}
                {piece.status === 'pending' && 'Pendente'}
                {piece.status === 'approved' && 'Aprovado'}
                {piece.status === 'adjust' && 'Ajustar'}
                {piece.status === 'posted' && 'Postado'}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(piece)}><Edit size={16}/></Button>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{piece.caption}</p>
                    {piece.status === 'adjust' && piece.feedback && (
                    <p className="text-sm text-yellow-400 mt-2 p-2 bg-yellow-900/50 rounded"><b>Feedback:</b> {piece.feedback}</p>
                    )}
                    <div className="mt-3 p-3 bg-black/20 rounded">
                        <p className="text-xs font-semibold text-[var(--btn-grad-from)] mb-1">Prompt de Imagem (IA):</p>
                        <p className="text-xs text-gray-400 font-mono">{piece.imagePrompt}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center bg-black/20 rounded p-4 space-y-3">
                {piece.finalArtUrl ? (
                    <>
                    <img src={piece.finalArtUrl} alt="Arte Final" className="max-h-32 rounded cursor-pointer" onClick={() => onViewImage(piece.finalArtUrl!)}/>
                        <div className="flex space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => onViewImage(piece.finalArtUrl!)}><Eye size={14} className="mr-1"/> Ampliar</Button>
                        <label className={`relative cursor-pointer`}>
                        <Button size="sm" variant="ghost" as="span" disabled={uploading}>
                            {uploading ? 'Enviando...' : <><Replace size={14} className="mr-1"/> Substituir</>}
                        </Button>
                        <input type="file" className="hidden" onChange={(e) => onFileUpload(e, piece.id)} disabled={uploading}/>
                        </label>
                    </div>
                    </>
                ) : (
                    <>
                    <ImageIcon size={32} className="text-gray-500"/>
                    <label className={`relative cursor-pointer text-sm`}>
                        <Button size="sm" as="span" disabled={uploading}>
                            {uploading ? 'Enviando...' : <><UploadCloud size={16} className="mr-1"/> Anexar Arte Final</>}
                        </Button>
                        <input type="file" className="hidden" onChange={(e) => onFileUpload(e, piece.id)} disabled={uploading}/>
                    </label>
                    </>
                )}
                </div>
            </div>
        </div>
    );
};


const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, updateProject, deleteProject } = useData();
  const { agencyId } = useAuth();
  const { addToast } = useToast();
  
  const [project, setProject] = useState<Project | null>(state?.project || null);
  
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null);
  
  // States for AI Assistant
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionTargetField, setSuggestionTargetField] = useState<'title' | 'subtitle' | 'caption' | null>(null);

  const [editableDetails, setEditableDetails] = useState({
    link_instagram: '',
    link_google_drive: '',
    link_referencia: '',
    data_entrega: '',
    tags: '',
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const foundProject = projects.find(p => p.id === Number(projectId));
      if (foundProject) {
        setProject(foundProject);
      }
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (project) {
        setEditableDetails({
            link_instagram: project.link_instagram || '',
            link_google_drive: project.link_google_drive || '',
            link_referencia: project.link_referencia || '',
            data_entrega: project.data_entrega ? new Date(project.data_entrega).toISOString().split('T')[0] : '',
            tags: project.tags?.join(', ') || '',
        });
    }
  }, [project]);

  const clientPortalLink = useMemo(() => {
    if (project) {
        return `${window.location.origin}${window.location.pathname}#/portal/${project.id_agencia}/${project.id}`;
    }
    return '';
  }, [project]);
  
  const handleCopyLink = () => {
      navigator.clipboard.writeText(clientPortalLink).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, pieceId: string, isCarousel: boolean) => {
    if (!e.target.files || e.target.files.length === 0 || !project || !agencyId) return;
    const file = e.target.files[0];
    setUploading(prev => ({ ...prev, [pieceId]: true }));
    try {
      const fileUrl = await storageService.uploadArtwork(project.id_agencia, project.id, file);
      
      const sourceArray = isCarousel ? project.pecas_carrossel || [] : project.pecas_conteudo;
      const updatedPieces = sourceArray.map(p => 
        p.id === pieceId ? { ...p, finalArtUrl: fileUrl, status: 'pending' as const } : p
      );

      const updateData = isCarousel ? { pecas_carrossel: updatedPieces } : { pecas_conteudo: updatedPieces };
      await updateProject(project.id, updateData);
      
      addToast('Arte final anexada com sucesso!', 'success');

    } catch (error) {
      console.error("Error uploading file:", error);
      addToast(`Falha ao enviar o arquivo: ${(error as Error).message}`, 'error');
    } finally {
      setUploading(prev => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleSaveDetails = async () => {
    if (!project || !agencyId) return;
    setIsSavingDetails(true);

    const tagsArray = editableDetails.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const updatedFields = {
        link_instagram: editableDetails.link_instagram,
        link_google_drive: editableDetails.link_google_drive,
        link_referencia: editableDetails.link_referencia,
        data_entrega: editableDetails.data_entrega || null,
        tags: tagsArray,
    };

    try {
        await updateProject(project.id, updatedFields);
        addToast('Detalhes salvos com sucesso!', 'success');
    } catch (error) {
        // Error already handled and toasted by DataContext
    } finally {
        setIsSavingDetails(false);
    }
  }

  const handleSavePiece = async () => {
    if (!project || !editingPiece || !agencyId) return;

    const isCarousel = project.pecas_carrossel?.some(p => p.id === editingPiece.id) ?? false;
    
    const sourceArray = isCarousel ? project.pecas_carrossel || [] : project.pecas_conteudo;
    const updatedPieces = sourceArray.map(p => 
        p.id === editingPiece.id ? editingPiece : p
    );
    
    const updateData = isCarousel ? { pecas_carrossel: updatedPieces } : { pecas_conteudo: updatedPieces };
    try {
        await updateProject(project.id, updateData);
        addToast('Peça de conteúdo salva!', 'success');
        setEditingPiece(null);
    } catch (error) {
         // Error already handled and toasted by DataContext
    }
  }
  
    // Nova função para chamar o assistente de IA
    const handleAiOptimize = async (
        field: 'title' | 'subtitle' | 'caption',
        command: AiAssistantCommand
    ) => {
        if (!editingPiece || !project) return;
        
        setSuggestionTargetField(field);
        setIsOptimizing(true);
        setSuggestionModalOpen(true);
        setSuggestions([]);

        try {
            const response = await geminiService.optimizeContent({
                text: editingPiece[field],
                command: command,
                context: { client: project.cliente, objective: project.objective }
            });
            if (Array.isArray(response.result)) {
                setSuggestions(response.result);
            } else {
                setSuggestions([response.result]);
            }
        } catch (error) {
            addToast((error as Error).message, 'error');
            setSuggestionModalOpen(false);
        } finally {
            setIsOptimizing(false);
        }
    };
    
    const applySuggestion = (suggestion: string) => {
        if (editingPiece && suggestionTargetField) {
            setEditingPiece({ ...editingPiece, [suggestionTargetField]: suggestion });
        }
        setSuggestionModalOpen(false);
    };

    const handleDeleteProject = async () => {
        if (!project || !agencyId) return;

        if (window.confirm(`Tem certeza que deseja deletar o projeto "${project.nome}"? Esta ação não pode ser desfeita.`)) {
            setIsDeleting(true);
            try {
                await deleteProject(project.id);
                addToast('Projeto deletado com sucesso.', 'success');
                navigate('/projects');
            } catch (error) {
                // Error already handled and toasted by DataContext
                setIsDeleting(false);
            }
        }
    };


  if (projectsLoading && !project) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (!project) {
    return (
        <div className="flex flex-col h-full">
            <Header />
            <div className="p-6 text-center">
                <p>O projeto que você está procurando não foi encontrado.</p>
                <Link to="/projects" className="text-[var(--btn-grad-from)] hover:underline mt-4 inline-block">Voltar para Projetos</Link>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-8">
        <div className="glass-panel p-6 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{project.nome}</h2>
              <p className="text-lg text-gray-400">{project.cliente}</p>
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-4">
                  {project.data_entrega && (
                      <div className="flex items-center text-sm text-gray-300">
                          <Clock size={16} className="mr-2 text-gray-500" />
                          <strong>Data de Entrega:</strong><span className="ml-2">{new Date(project.data_entrega).toLocaleDateString()}</span>
                      </div>
                  )}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex items-center text-sm text-gray-300">
                      <Tag size={16} className="mr-2 text-gray-500" />
                      <strong>Tags:</strong>
                      <div className="flex flex-wrap gap-2 ml-2">
                          {project.tags.map(tag => (
                              <span key={tag} className="bg-white/10 text-xs text-gray-200 px-2 py-1 rounded-full">{tag}</span>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={handleCopyLink} variant="secondary" size="sm">
                    {linkCopied ? <CheckCircle size={16} className="mr-2"/> : <Clipboard size={16} className="mr-2"/>}
                    {linkCopied ? 'Copiado!' : 'Copiar Link do Portal'}
                </Button>
                <Button onClick={handleDeleteProject} variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 hover:text-red-400" isLoading={isDeleting}>
                    <Trash2 size={16} className="mr-2"/>
                    Deletar Projeto
                </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2">Detalhes e Links do Projeto</h3>
                <div className="space-y-4">
                    <Input label="Data de Entrega" type="date" value={editableDetails.data_entrega} onChange={e => setEditableDetails({...editableDetails, data_entrega: e.target.value})} />
                    <Input label="Tags (separadas por vírgula)" value={editableDetails.tags} onChange={e => setEditableDetails({...editableDetails, tags: e.target.value})} placeholder="Urgente, Designer Ana" />
                    <hr className="border-white/10" />
                    <Input label="Link do Instagram" value={editableDetails.link_instagram} onChange={e => setEditableDetails({...editableDetails, link_instagram: e.target.value})} placeholder="https://instagram.com/..." />
                    <Input label="Link do Google Drive" value={editableDetails.link_google_drive} onChange={e => setEditableDetails({...editableDetails, link_google_drive: e.target.value})} placeholder="https://drive.google.com/..." />
                    <Input label="Link de Referência" value={editableDetails.link_referencia} onChange={e => setEditableDetails({...editableDetails, link_referencia: e.target.value})} placeholder="https://exemplo.com" />
                    <Button onClick={handleSaveDetails} isLoading={isSavingDetails} size="sm" className="w-full">
                        <Save size={16} className="mr-2" /> Salvar Detalhes
                    </Button>
                </div>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2">Estratégia da Campanha</h3>
              <div className="space-y-4 text-sm">
                  <div>
                      <strong className="text-gray-300 block">Tom de Voz:</strong>
                      <p className="text-gray-400">{project.tom_de_voz}</p>
                  </div>
                  <div>
                      <strong className="text-gray-300 block">Persona:</strong>
                      <p className="text-gray-400 whitespace-pre-wrap">{project.persona}</p>
                  </div>
                   <div>
                      <strong className="text-gray-300 block">Calendário Sugerido:</strong>
                      <p className="text-gray-400 whitespace-pre-wrap">{project.calendario_publicacao}</p>
                   </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {project.pecas_conteudo.length > 0 && (
              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Layers size={20}/> Peças de Conteúdo Estático
                </h3>
                <div className="space-y-4">
                  {project.pecas_conteudo.map(piece => (
                    <ContentPieceCard
                      key={piece.id}
                      piece={piece}
                      project={project}
                      onFileUpload={(e) => handleFileUpload(e, piece.id, false)}
                      onEdit={() => setEditingPiece(piece)}
                      onViewImage={setImageModalUrl}
                      uploading={uploading[piece.id] || false}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {project.pecas_carrossel && project.pecas_carrossel.length > 0 && (
              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Layers size={20}/> Peças de Carrossel
                </h3>
                 <div className="flex items-start gap-2 p-3 text-sm text-blue-300 bg-blue-500/10 rounded-md mb-4">
                    <Info size={18} className="flex-shrink-0 mt-0.5" />
                    <span>Para o portal do cliente, anexe a arte final na <strong className="font-semibold">primeira lâmina</strong> de cada carrossel. Ela será usada como a capa representativa.</span>
                </div>
                <div className="space-y-4">
                  {project.pecas_carrossel.map(piece => (
                    <ContentPieceCard
                      key={piece.id}
                      piece={piece}
                      project={project}
                      onFileUpload={(e) => handleFileUpload(e, piece.id, true)}
                      onEdit={() => setEditingPiece(piece)}
                      onViewImage={setImageModalUrl}
                      uploading={uploading[piece.id] || false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Modal isOpen={!!imageModalUrl} onClose={() => setImageModalUrl(null)} title="Visualizar Imagem">
        <img src={imageModalUrl || ''} alt="Arte Final Ampliada" className="w-full h-auto rounded-lg"/>
      </Modal>

      <Modal isOpen={!!editingPiece} onClose={() => setEditingPiece(null)} title="Editar Peça de Conteúdo">
        {editingPiece && (
          <div className="space-y-4">
                <div className="relative">
                    <Input label="Título" value={editingPiece.title} onChange={e => setEditingPiece({...editingPiece, title: e.target.value})} />
                    <div className="absolute top-8 right-2"><AiAssistantMenu onSelect={(cmd) => handleAiOptimize('title', cmd)} fieldType="title" /></div>
                </div>
                <div className="relative">
                    <Input label="Subtítulo" value={editingPiece.subtitle} onChange={e => setEditingPiece({...editingPiece, subtitle: e.target.value})} />
                    <div className="absolute top-8 right-2"><AiAssistantMenu onSelect={(cmd) => handleAiOptimize('subtitle', cmd)} fieldType="subtitle" /></div>
                </div>
              <Input label="CTA" value={editingPiece.cta} onChange={e => setEditingPiece({...editingPiece, cta: e.target.value})} />
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">Legenda</label>
                <textarea rows={5} value={editingPiece.caption} onChange={e => setEditingPiece({...editingPiece, caption: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2"/>
                <div className="absolute top-0 right-2"><AiAssistantMenu onSelect={(cmd) => handleAiOptimize('caption', cmd)} fieldType="caption" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prompt de Imagem (IA)</label>
                <textarea rows={3} value={editingPiece.imagePrompt} onChange={e => setEditingPiece({...editingPiece, imagePrompt: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 font-mono text-sm"/>
              </div>
              <div className="flex justify-end pt-4">
                  <Button onClick={handleSavePiece}><Save size={16} className="mr-2" /> Salvar Peça</Button>
              </div>
          </div>
        )}
      </Modal>

        {/* Modal para exibir sugestões da IA */}
        <Modal isOpen={isSuggestionModalOpen} onClose={() => setSuggestionModalOpen(false)} title="Sugestões da IA">
            {isOptimizing ? (
                <div className="flex justify-center items-center h-40"><Spinner /></div>
            ) : (
                <div className="space-y-3">
                    {suggestions.map((s, i) => (
                        <div key={i} className="bg-white/5 p-3 rounded-md">
                            <p className="text-gray-300 text-sm">{s}</p>
                            <div className="text-right mt-2">
                                <Button size="sm" variant="secondary" onClick={() => applySuggestion(s)}>Aplicar esta sugestão</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    </div>
  );
};

export default ProjectDetailPage;
import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Project, ProjectStatus, ContentPiece } from '../../types';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Spinner from '../../components/Spinner';
import { supabaseService } from '../../services/firestoreService';
import { geminiService } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';
import { PlusCircle, Search, Clock, CheckCircle, AlertTriangle, Layers, Frown, Upload, X, FileText, Mic, StopCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// @ts-ignore - pdf.js é carregado via CDN através do import map
const pdfjsLib = window['pdfjs-dist'];

// Configura o caminho do worker para o pdf.js para processamento em segundo plano.
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
}

const statusConfig = {
    [ProjectStatus.Briefing]: { label: 'Briefing', color: 'bg-blue-500/20 text-blue-400', icon: <Layers size={12} /> },
    [ProjectStatus.Producing]: { label: 'Produzindo', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock size={12} /> },
    [ProjectStatus.Approval]: { label: 'Aprovação', color: 'bg-purple-500/20 text-purple-400', icon: <AlertTriangle size={12} /> },
    [ProjectStatus.Adjustments]: { label: 'Ajustes', color: 'bg-orange-500/20 text-orange-400', icon: <AlertTriangle size={12} /> },
    [ProjectStatus.Posted]: { label: 'Postado', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle size={12} /> },
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const config = statusConfig[project.status] || statusConfig[ProjectStatus.Briefing];

    return (
        <Link to={`/projects/${project.id}`} state={{ project }}>
            <div className="glass-panel p-5 rounded-lg h-full flex flex-col justify-between hover:border-white/20 transition-all duration-300 animate-fadeIn">
                <div>
                    <h3 className="font-bold text-lg text-white truncate">{project.nome}</h3>
                    <p className="text-sm text-gray-400 mb-3 truncate">{project.cliente}</p>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.color}`}>
                        {config.icon}
                        <span>{config.label}</span>
                    </div>
                    {project.data_entrega && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Clock size={12} />
                            <span>{new Date(project.data_entrega).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

const initialFormState = {
    nome: '',
    client: '',
    segment: '',
    objective: '',
    channels: ['Instagram', 'Facebook'],
    contentCount: 3,
    specificPostRequest: '',
    contentLength: 'médio' as const,
    carouselCount: 0,
    carouselSlideCount: 3,
    documentContext: '',
    documentFile: null as File | null,
};

type RecordingTarget = 'objective' | 'specificPostRequest';

const PLANO_PADRAO_ID = 'price_1SDB6OP7wbQf0EBDVlYXGw8d';
const LIMITE_PROJETOS = 20;

const ProjectsPage: React.FC = () => {
    const { projects, loading } = useData();
    const { agencyId, user, refreshUser } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [formState, setFormState] = useState(initialFormState);
    const [isParsingFile, setIsParsingFile] = useState(false);
    
    const [recordingTarget, setRecordingTarget] = useState<RecordingTarget | null>(null);
    const [transcribingTarget, setTranscribingTarget] = useState<RecordingTarget | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const isStandardPlan = user?.subscription?.plan_id === PLANO_PADRAO_ID;
    const projectCount = user?.monthly_project_count || 0;

    const counterColorClass = useMemo(() => {
        if (projectCount >= LIMITE_PROJETOS) return 'text-red-400 border-red-500/50';
        if (projectCount >= 15) return 'text-yellow-400 border-yellow-500/50';
        return 'text-gray-400 border-transparent';
    }, [projectCount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormState(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            addToast('O arquivo é muito grande. O limite é de 5MB.', 'error');
            return;
        }

        setIsParsingFile(true);
        setFormState(prev => ({ ...prev, documentFile: file, documentContext: '' }));

        try {
            let textContent = '';
            if (file.type.startsWith('image/')) {
                textContent = await geminiService.getTextFromImage(file);
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContentData = await page.getTextContent();
                    textContent += textContentData.items.map(item => 'str' in item ? item.str : '').join(' ');
                }
            } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
                textContent = await file.text();
            } else {
                addToast('Tipo de arquivo não suportado. Use PDF, TXT, PNG ou JPG.', 'error');
                setFormState(prev => ({ ...prev, documentFile: null, documentContext: '' }));
                setIsParsingFile(false);
                return;
            }
            setFormState(prev => ({ ...prev, documentContext: textContent.trim() }));
            addToast(`Arquivo "${file.name}" lido e analisado com sucesso!`, 'success');
        } catch (error) {
            console.error("Error parsing file:", error);
            addToast(`Não foi possível ler o conteúdo do arquivo: ${(error as Error).message}`, 'error');
            setFormState(prev => ({ ...prev, documentFile: null, documentContext: '' }));
        } finally {
            setIsParsingFile(false);
        }
    };
    
    const handleRemoveFile = () => {
        setFormState(prev => ({ ...prev, documentFile: null, documentContext: '' }));
    };

    const handleGenerateBriefing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agencyId || !user) {
            addToast("Não foi possível identificar sua agência ou usuário.", "error");
            return;
        }
        
        const subscription = user.subscription;
        const isSubscribed = subscription && (subscription.status === 'active' || subscription.status === 'trialing');

        if (!isSubscribed) {
            addToast("Você precisa de uma assinatura ativa para criar projetos.", "warning");
            navigate('/account');
            return;
        }

        if (subscription.plan_id === PLANO_PADRAO_ID) {
            const currentProjectCount = user.monthly_project_count || 0;
            if (currentProjectCount >= LIMITE_PROJETOS) {
                addToast(`Você atingiu o limite de ${LIMITE_PROJETOS} projetos do Plano Padrão. Faça o upgrade para continuar.`, "warning");
                navigate('/account');
                return;
            }
        }

        setIsGenerating(true);
        try {
            const briefingInput = {
                client: formState.client,
                segment: formState.segment,
                objective: formState.objective,
                channels: formState.channels,
                contentCount: Number(formState.contentCount),
                specificPostRequest: formState.specificPostRequest,
                contentLength: formState.contentLength,
                carouselCount: Number(formState.carouselCount),
                carouselSlideCount: Number(formState.carouselSlideCount),
                documentContext: formState.documentContext,
            };

            const briefingOutput = await geminiService.generateProjectBriefing(briefingInput);

            const mapContentPiece = (piece: any): ContentPiece => ({
                id: uuidv4(),
                title: piece.title,
                subtitle: piece.subtitle,
                cta: piece.cta,
                caption: piece.caption,
                imagePrompt: piece.imagePrompt,
                status: 'pending',
            });
            
            const newProjectData: Omit<Project, 'id' | 'id_agencia' | 'created_at'> = {
                euIa: user.uid,
                nome: formState.nome,
                cliente: formState.client,
                status: ProjectStatus.Briefing,
                pecas_conteudo: briefingOutput.pecas_conteudo.map(mapContentPiece),
                pecas_carrossel: briefingOutput.pecas_carrosseis?.flat().map(mapContentPiece),
                tom_de_voz: briefingOutput.tom_de_voz,
                persona: briefingOutput.persona,
                calendario_publicacao: briefingOutput.calendario_publicacao,
                segment: formState.segment,
                objective: formState.objective,
                canais: formState.channels,
            };

            const createdProject = await supabaseService.addProject(agencyId, newProjectData);
            
            if (subscription.plan_id === PLANO_PADRAO_ID) {
                await supabaseService.incrementProjectCount();
                await refreshUser(); // Refresh user data to get the new count
            }

            addToast(`Projeto "${createdProject.nome}" criado com sucesso!`, 'success');
            setIsModalOpen(false);
            setFormState(initialFormState);
        } catch (error) {
            console.error("Failed to generate briefing:", error);
            addToast(`Falha ao gerar briefing: ${(error as Error).message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredProjects = useMemo(() => {
        const baseProjects = projects.filter(p => {
            if (viewMode === 'active') {
                return p.status !== ProjectStatus.Posted;
            }
            return p.status === ProjectStatus.Posted;
        });

        if (!searchQuery) return baseProjects;
        const lowercasedQuery = searchQuery.toLowerCase();
        return baseProjects.filter(p =>
            p.nome.toLowerCase().includes(lowercasedQuery) ||
            p.cliente.toLowerCase().includes(lowercasedQuery)
        );
    }, [projects, searchQuery, viewMode]);
    
    const startRecording = async (target: RecordingTarget) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.addEventListener("dataavailable", event => {
                audioChunksRef.current.push(event.data);
            });

            mediaRecorderRef.current.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                setTranscribingTarget(target);
                try {
                    const transcribedText = await geminiService.transcribeAudio(audioBlob);
                    setFormState(prev => ({
                        ...prev,
                        [target]: (prev[target] + ' ' + transcribedText).trim(),
                    }));
                    addToast('Áudio transcrito com sucesso!', 'success');
                } catch (error) {
                    addToast((error as Error).message, 'error');
                } finally {
                    setTranscribingTarget(null);
                }
            });

            mediaRecorderRef.current.start();
            setRecordingTarget(target);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            addToast("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.", "error");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecordingTarget(null);
        }
    };

    const handleMicClick = (target: RecordingTarget) => {
        if (recordingTarget === target) {
            stopRecording();
        } else if (!recordingTarget) {
            startRecording(target);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <Header />
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-3xl font-bold text-white">Projetos</h1>
                        {isStandardPlan && (
                            <div title="Projetos criados este mês" className={`flex items-center gap-2 text-sm font-medium glass-panel px-3 py-1.5 rounded-full border transition-colors ${counterColorClass}`}>
                                <Layers size={14} />
                                <span>{projectCount} / {LIMITE_PROJETOS}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                           <input
                             type="text"
                             placeholder="Buscar por nome ou cliente..."
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             className="w-full bg-white/5 border border-white/10 text-white rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)]"
                           />
                        </div>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusCircle size={16} className="mr-2"/> Novo Projeto
                        </Button>
                    </div>
                </div>
                
                <div className="flex border-b border-white/10 mb-6">
                    <button onClick={() => setViewMode('active')} className={`py-2 px-4 text-lg ${viewMode === 'active' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Ativos</button>
                    <button onClick={() => setViewMode('archived')} className={`py-2 px-4 text-lg ${viewMode === 'archived' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Arquivados</button>
                </div>

                {loading ? (
                    <div className="flex justify-center mt-10"><Spinner /></div>
                ) : filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map(project => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-20">
                        <Frown size={48} className="mx-auto mb-4"/>
                        <p className="text-lg">
                            {viewMode === 'active' ? 'Nenhum projeto ativo encontrado.' : 'Nenhum projeto arquivado.'}
                        </p>
                        <p className="text-sm">
                            {searchQuery ? 'Tente ajustar sua busca.' : (viewMode === 'active' ? 'Crie um novo projeto para começar.' : 'Projetos finalizados aparecerão aqui.')}
                        </p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setFormState(initialFormState); }}>
                <form onSubmit={handleGenerateBriefing} className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">Preencha os detalhes abaixo para que a IA crie um briefing completo e as peças de conteúdo iniciais.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="nome" label="Nome do Projeto" value={formState.nome} onChange={handleInputChange} required />
                        <Input name="client" label="Nome do Cliente" value={formState.client} onChange={handleInputChange} required />
                    </div>
                    <Input name="segment" label="Segmento do Cliente" value={formState.segment} onChange={handleInputChange} placeholder="Ex: Moda sustentável, Comida vegana" required />
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <div>
                                <label htmlFor="objective" className="block text-sm font-medium text-gray-300">
                                    Briefing Detalhado do Projeto
                                </label>
                                <p className="text-xs text-gray-500">Use sua voz para detalhar o briefing.</p>
                            </div>
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMicClick('objective')}
                                    disabled={!!transcribingTarget || (!!recordingTarget && recordingTarget !== 'objective')}
                                    className={`p-2 h-auto rounded-full transition-colors ${recordingTarget === 'objective' ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-white'}`}
                                    title={recordingTarget === 'objective' ? 'Parar Gravação' : 'Gravar Briefing com Áudio'}
                                >
                                    {transcribingTarget === 'objective' ? (
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    ) : recordingTarget === 'objective' ? (
                                        <StopCircle size={20} />
                                    ) : (
                                        <Mic size={20} />
                                    )}
                                </Button>
                                {recordingTarget === 'objective' && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-800 bg-red-500 animate-ping"></span>}
                            </div>
                        </div>
                        <textarea
                            id="objective"
                            name="objective"
                            rows={4}
                            value={formState.objective}
                            onChange={handleInputChange}
                            placeholder="Ex: Clínica de estética focada em rejuvenescimento. Falar sobre os benefícios do tratamento X, mostrar antes e depois (conceitual), e criar uma promoção para novos clientes."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:border-[var(--btn-grad-to)] transition"
                            required
                        />
                    </div>
                    
                     <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Contexto Adicional (Opcional)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Anexe um documento (.pdf, .txt) ou imagem (.png, .jpg) com informações sobre o cliente. Você pode enviar prints do Instagram para a IA ter uma base do que já vem sido criado.</p>
                        {formState.documentFile ? (
                            <div className="flex items-center justify-between bg-white/10 p-3 rounded-md">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText size={20} className="text-[var(--btn-grad-from)] flex-shrink-0" />
                                    <span className="text-sm text-gray-200 truncate">{formState.documentFile.name}</span>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="p-1 h-auto flex-shrink-0">
                                    <X size={16} />
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileChange}
                                    accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                                    disabled={isParsingFile}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isParsingFile ? 'border-gray-600 bg-gray-800' : 'border-white/20 hover:border-[var(--btn-grad-to)] hover:bg-white/5'}`}
                                >
                                    {isParsingFile ? (
                                        <Spinner />
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-gray-400" />
                                            <p className="text-sm text-gray-400 mt-2">
                                                <span className="font-semibold text-[var(--btn-grad-from)]">Clique para enviar</span> ou arraste e solte
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                           <div>
                                <label htmlFor="specificPostRequest" className="block text-sm font-medium text-gray-300">
                                    Deseja algum post personalizado? (Opcional)
                                </label>
                                <p className="text-xs text-gray-500">Descreva por áudio os posts que deseja.</p>
                            </div>
                           <div className="relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMicClick('specificPostRequest')}
                                    disabled={!!transcribingTarget || (!!recordingTarget && recordingTarget !== 'specificPostRequest')}
                                    className={`p-2 h-auto rounded-full transition-colors ${recordingTarget === 'specificPostRequest' ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-white'}`}
                                    title={recordingTarget === 'specificPostRequest' ? 'Parar Gravação' : 'Gravar Pedido com Áudio'}
                                >
                                    {transcribingTarget === 'specificPostRequest' ? (
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    ) : recordingTarget === 'specificPostRequest' ? (
                                        <StopCircle size={20} />
                                    ) : (
                                        <Mic size={20} />
                                    )}
                                </Button>
                                {recordingTarget === 'specificPostRequest' && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-800 bg-red-500 animate-ping"></span>}
                            </div>
                        </div>
                        <textarea
                            id="specificPostRequest"
                            name="specificPostRequest"
                            rows={3}
                            value={formState.specificPostRequest}
                            onChange={handleInputChange}
                            placeholder="Ex: Preciso de 2 posts personalizados, um para o Dia das Mães e outro sobre nossa promoção de inverno."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:border-[var(--btn-grad-to)] transition"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Qtd. Posts Estáticos</label>
                          <input type="range" name="contentCount" min="1" max="12" value={formState.contentCount} onChange={handleInputChange} className="w-full" />
                          <div className="text-center text-sm text-gray-400">{formState.contentCount} posts</div>
                        </div>
                        <div>
                            <label htmlFor="contentLength" className="block text-sm font-medium text-gray-300 mb-1">
                                Tamanho dos Textos
                            </label>
                            <select
                                id="contentLength"
                                name="contentLength"
                                value={formState.contentLength}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:border-[var(--btn-grad-to)] transition"
                            >
                                <option value="compacto">Pequenos</option>
                                <option value="médio">Médios</option>
                                <option value="longo">Grandes</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Qtd. Carrosséis (0 a 5)</label>
                        <input type="range" name="carouselCount" min="0" max="5" value={formState.carouselCount} onChange={handleInputChange} className="w-full" />
                        <div className="text-center text-sm text-gray-400">{formState.carouselCount} carrosséis</div>
                    </div>

                    {Number(formState.carouselCount) > 0 && (
                      <div className="pl-6 animate-fadeIn">
                          <label className="block text-sm font-medium text-gray-300 mb-1">Qtd. Lâminas por Carrossel</label>
                          <input type="range" name="carouselSlideCount" min="2" max="10" value={formState.carouselSlideCount} onChange={handleInputChange} className="w-full" />
                          <div className="text-center text-sm text-gray-400">{formState.carouselSlideCount} lâminas</div>
                      </div>
                    )}
                    
                    <div className="pt-4 flex justify-end">
                        <Button type="submit" isLoading={isGenerating}>Gerar Briefing e Conteúdo</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProjectsPage;

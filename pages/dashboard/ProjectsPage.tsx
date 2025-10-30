import React, { useState, useMemo, useRef, useEffect } from 'react'; // Adicionado useEffect
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

// 1. IMPORTAÇÃO ESTÁTICA REMOVIDA
// import * as pdfjsLib from 'pdfjs-dist';
// pdfjsLib.GlobalWorkerOptions.workerSrc = `...`;

// 2. TIPO IMPORTADO DINAMICAMENTE
// Isso permite que o TypeScript entenda os tipos sem importar o pacote no build
type PdfjsLibType = typeof import('pdfjs-dist');


// --- O restante do seu código (statusConfig, ProjectCard, initialFormState) ---
// (O código do ProjectCard e statusConfig está omitido aqui para ser mais curto, 
// mas ele deve permanecer no seu arquivo como estava)
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

    // 3. REFERÊNCIA PARA GUARDAR A BIBLIOTECA
    const pdfjsLibRef = useRef<PdfjsLibType | null>(null);
    const [isPdfModuleLoading, setIsPdfModuleLoading] = useState(true);

    // 4. USE EFFECT PARA CARREGAMENTO DINÂMICO
    useEffect(() => {
        // Isso força a importação a acontecer apenas no navegador
        import('pdfjs-dist')
            .then(pdfjsModule => {
                // Configura o worker
                pdfjsModule.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
                // Armazena a biblioteca na referência
                pdfjsLibRef.current = pdfjsModule;
                setIsPdfModuleLoading(false);
            })
            .catch(error => {
                console.error("Erro ao carregar pdfjs-dist:", error);
                addToast("Erro ao carregar leitor de PDF. Upload de PDF desabilitado.", "error");
                setIsPdfModuleLoading(false);
            });
    }, []); // Executa apenas uma vez

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
                
                // 5. MODIFICAÇÃO NA LÓGICA DE PDF
                // Pega a biblioteca da referência
                const pdfjsLib = pdfjsLibRef.current; 
                
                // Verifica se a biblioteca foi carregada
                if (!pdfjsLib) {
                    setIsParsingFile(false);
                    addToast("O leitor de PDF ainda está carregando, tente novamente em alguns segundos.", "warning");
                    return;
                }

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise; // Usa a biblioteca da ref
                for (let i = 1; i <= pdf.numPages; i++) {
M                   const page = await pdf.getPage(i);
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

    // --- O RESTANTE DO SEU CÓDIGO (handleGenerateBriefing, filteredProjects, startRecording, etc.) ---
    // (O código está omitido aqui para ser mais curto, mas ele deve permanecer no seu arquivo como estava)
    // --- COLE O RESTANTE DO CÓDIGO DO PDF A PARTIR DAQUI ---

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
  M               contentCount: Number(formState.contentCount),
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
Note: The content for the user-provided file `Untitled document (10).pdf` was truncated. Full content follows:
--- PAGE 1 ---

import React, { useState, useMemo, useRef, useCallback } from 'react';

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

import { PlusCircle, Search, Clock, CheckCircle, Alert Triangle, Layers, Frown, Upload, X,

FileText, Mic, StopCircle } from 'lucide-react';

import { v4 as uuidv4 } from 'uuid';

import * as pdfjsLib from 'pdfjs-dist';

// Configura o caminho do worker para o pdf.js para processamento em segundo plano.
 pdfjsLib.GlobalWorkerOptions.workerSrc =

https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const statusConfig = {

[ProjectStatus.Briefing]: { label: 'Briefing', color: 'bg-blue-500/20 text-blue-400', icon: <Layers
 size $=\{12\}/>\}$

[ProjectStatus. Producing]: { label: 'Produzindo', color: 'bg-yellow-500/20 text-yellow-400',
 icon: <Clock size $=\{12\}/>\}$,

[ProjectStatus.Approval]: { label: 'Aprovação', color: 'bg-purple-500/20 text-purple-400', icon:
 <Alert Triangle size $=\{12\}/>\}$,

[ProjectStatus.Adjustments]: { label: 'Ajustes', color: 'bg-orange-500/20 text-orange-400', icon:
 <Alert Triangle size $=\{12\}/>\}$,

[ProjectStatus.Posted]: { label: 'Postado', color: 'bg-green-500/20 text-green-400', icon:

<CheckCircle size $=\{12\}/>\}$,

};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {

const config = statusConfig[project.status] || statusConfig[ProjectStatus. Briefing];

return (

<Link to={/projects/\${project.id} } state={{ project }}>

<div className="glass-panel p-5 rounded-lg h-full flex flex-col justify-between
 hover:border-white/20 transition-all duration-300 animate-fadeln">

<div>

<h3 className="font-bold text-lg text-white truncate">{project.nome}</h3>

--- PAGE 2 ---

<p className="text-sm text-gray-400 mb-3 truncate">{project.cliente}</p>

</div>

<div className="flex justify-between items-center text-xs">

<div className={'flex items-center gap-1.5 px-2 py-1 rounded-full

\${config.color} }>

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

const initial FormState = {

nome: ",

};

client: ",

segment: ",

objective: ",

channels: ['Instagram', 'Facebook'],

contentCount: 3,

specificPostRequest: ",

contentLength: 'médio' as const,

carouselCount: 0,

carousel SlideCount: 3,

documentContext: ",

documentFile: null as File | null,

type FormStateKey = 'objective' | 'specificPostRequest';

interface AudioInputProps {

id: FormStateKey;

label: string;

subtext: string;

value: string;

onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
 placeholder: string;

--- PAGE 3 ---

}

required?: boolean;

rows?: number;

const Audiolnput: React.FC<AudioInputProps> = ({ id, label, subtext, value, onChange,
 placeholder, required = false, rows = 4 }) => {

const { addToast } = use Toast();

const [recording, setRecording] = useState(false);

const [transcribing, setTranscribing] = useState(false);

const mediaRecorderRef = useRef<Media Recorder | null>(null);

const audioChunksRef = useRef<Blob[ >(0);

const startRecording = async () => {

try {

const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 mediaRecorderRef.current = new Media Recorder(stream, { mimeType: 'audio/webm' });

audioChunks Ref.current $=$

mediaRecorderRef.current.addEventListener("dataavailable", event => {

});

audioChunks Ref.current.push(event.data);

mediaRecorderRef.current.addEventListener("stop", async ( $()=>$ {

const audioBlob = new Blob(audioChunks Ref.current, { type: 'audio/webm' });

stream.getTracks().forEach(track => track.stop());

setTranscribing(true);

try {

const transcribedText = await geminiService.transcribeAudio(audioBlob);

// Simula um evento de mudança para atualizar o formState com o texto transcrito
 const fakeEvent = {

target: {

}

name: id,

value: (value + ''+ transcribed Text).trim(),

} as React.ChangeEvent<HTML TextAreaElement>;

onChange(fakeEvent);

addToast('Áudio transcrito com sucesso!', 'success');

} catch (error) {

addToast( Falha na transcrição: \${(error as Error).message ', 'error');
 } finally {

setTranscribing(false);

--- PAGE 4 ---

}
 });

mediaRecorderRef.current.start();

setRecording(true);

} catch (err) {

console.error("Error accessing microphone:", err);

addToast("Não foi possível acessar o microfone. Verifique as permissões do seu

navegador.", "еггог");

}

};

const stopRecording $=()=>\{$

if (mediaRecorderRef.current && media RecorderRef.current.state === 'recording') {

mediaRecorderRef.current.stop();

setRecording(false);

}

};

const handleMicClick $=()=>$ {

if (recording) {

stopRecording();

} else if (!transcribing) {

startRecording();

}

};

// O texto mostrado no campo quando está transcrevendo

const displayValue = transcribing

? (value || ") + '\n\n... Transcrevendo áudio, aguarde...'

: value;

return (

<div>

<div className="flex justify-between items-center mb-1">
 <div>

<label htmlFor={id} className="block text-sm font-medium text-gray-300">

{label}

</label>

<p className="text-xs text-gray-500">{subtext}</p>

</div>

<div className="relative">

<Button

type="button"

--- PAGE 5 ---

variant="ghost"

size="sm

"

onClick={handleMicClick}

disabled={transcribing}

className={ p-2 h-auto rounded-full transition-colors \${recording? 'text-red-500

bg-red-500/10': 'text-gray-400 hover:text-white'}'}

title={recording? 'Parar Gravação': 'Gravar com Áudio'}

{transcribing?(

<div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full

animate-spin"></div>

): recording? (

<StopCircle size={20} />

):(

<Mic size={20} />

)}

</Button>

{recording && <span className="absolute top-0 right-0 block h-2.5 w-2.5

rounded-full ring-2 ring-gray-800 bg-red-500 animate-ping"></span>}

</div>

</div>

<textarea

id={id}

name={id}

rows={rows}

value={displayValue}

onChange={onChange}

placeholder={placeholder}

className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3

py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:border-[var(--btn-grad-to)] transition"

required={required}

disabled={transcribing}

/>

</div>

);

};

const PLANO_PADRAO_ID = 'price_1SDB6OP7wbQf0EBDVIYXGw8d';

const LIMITE_PROJETOS $=20$;

const ProjectsPage: React.FC $=()=>$ {

const { projects, loading } = useData();

const { agencyld, user, refreshUser } = useAuth();

--- PAGE 6 ---

const { addToast } = use Toast();
 const navigate = useNavigate();

const [isModal Open, setlsModal Open] = useState(false);
 const [isGenerating, setlsGenerating] = useState(false);

const [searchQuery, setSearchQuery] = useState(");

const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

const [formState, setFormState] = useState(initialFormState);

const [isParsing File, setls Parsing File] = useState(false);

// Removi os estados de gravação/transcrição do Projects Page e movi para o Audiolnput
 // const [recording Target, setRecording Target] = useState<FormStateKey | null>(null);

// const [transcribing Target, set Transcribing Target] = useState<FormStateKey | null>(null);
 // const mediaRecorderRef = useRef<MediaRecorder | null>(null);

// const audioChunksRef = useRef<Blob[]>([]);

const isStandardPlan = user?.subscription?.plan_id === PLANO_PADRAO_ID;

const projectCount = user?.monthly_project_count || 0;

const counterColorClass = useMemo(() => {

if (projectCount >= LIMITE_PROJETOS) return 'text-red-400 border-red-500/50';

if (projectCount >= 15) return 'text-yellow-400 border-yellow-500/50';

return 'text-gray-400 border-transparent';

}, [projectCount]);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement |

HTML TextArea Element | HTMLSelectElement>) => {

const { name, value, type } = e.target;

// O `name` é 'objective' ou 'specific PostRequest', que são as chaves FormStateKey
 const key = name as keyof typeof initial FormState;

if (type === 'checkbox') {

const checked = (e.target as HTMLInputElement).checked;

setFormState(prev => ({ ...prev, [key]: checked }));

} else {

// A tipagem do FormStateKey é essencial aqui

setFormState(prev => ({ ...prev, [key]: value }));

}

};

// Tipagem da função de mudança de estado para uso no AudioInput

const handle TextAreaChange = useCallback((e:

React.ChangeEvent<HTMLTextAreaElement>) => {

const { name, value } = e.target;

--- PAGE 7 ---

const key = name as FormStateKey;

setFormState(prev => ({ ...prev, [key]: value }));

}, []);

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

if (!e.target.files || e.target.files.length === 0) return;

const file = e.target.files[0];

if (!file) return;

if (file.size > 5*1024*1024) { // 5MB limit

}

addToast('O arquivo é muito grande. O limite é de 5MB.', 'error');

return;

setlsParsing File(true);

setFormState(prev => ({ ...prev, documentFile: file, documentContext: "}));

try {

let textContent $=^{m};$

if (file.type.startsWith('image/')) {

textContent = await geminiService.getTextFromImage(file);

} else if (file.type === 'application/pdf) {

const arrayBuffer = await file.arrayBuffer();

const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

for (let $i=1$ i <= pdf.numPages; i++) {

}

const page = await pdf.getPage(i);

const textContentData = await page.getTextContent();

textContent += textContentData.items.map(item => 'str' in item? item.str: ").join(' ');

} else if (file.type === 'text/plain' || file.type === 'text/markdown') {

textContent = await file.text();

} else {

}

add Toast('Tipo de arquivo não suportado. Use PDF, TXT, PNG ou JPG.', 'error');
 setFormState(prev => ({ ...prev, documentFile: null, documentContext: " }));
 setlsParsingFile(false);

return;

setFormState(prev => ({ ...prev, documentContext: textContent.trim() }));
 addToast(Arquivo "\${file.name}" lido e analisado com sucesso!', 'success');
 } catch (error) {

'error');

console.error("Error parsing file:", error);

addToast( Não foi possível ler o conteúdo do arquivo: \${(error as Error).message}',

setFormState(prev => ({ ...prev, documentFile: null, documentContext: "}));

--- PAGE 8 ---

} finally {

setls ParsingFile(false);

}

};

const handleRemoveFile $=()=>$ {

};

setFormState(prev => ({ ...prev, documentFile: null, documentContext: "}));

const handleGenerate Briefing = async (e: React. FormEvent) => {

e.preventDefault();

if (!agencyld || !user) {

}

addToast("Não foi possível identificar sua agência ou usuário.", "error");
 return;

const subscription = user.subscription;

const isSubscribed = subscription && (subscription.status === 'active' || subscription.status

=== 'trialing');

if (!isSubscribed) {

}

addToast("Você precisa de uma assinatura ativa para criar projetos.", "warning");

navigate('/account');

return;

if (subscription.plan_id === PLANO_PADRAO_ID) {

const currentProjectCount = user.monthly_project_count || 0;

if (currentProjectCount >= LIMITE_PROJETOS) {

addToast( Você atingiu o limite de \${LIMITE_PROJETOS} projetos do Plano Padrão.

Faça o upgrade para continuar.', "warning");

navigate('/account');

return;

}

}

setlsGenerating(true);

try {

const briefingInput $=\{$

client: formState.client,

segment: formState.segment,

objective: formState.objective,

channels: formState.channels,

contentCount: Number(formState.contentCount),

--- PAGE 9 ---

};

specific PostRequest: formState.specificPostRequest,

contentLength: formState.contentLength,

carouselCount: Number(formState.carouselCount),

carousel SlideCount: Number(formState.carousel SlideCount),

documentContext: formState.documentContext,

const briefingOutput = await geminiService.generate ProjectBriefing(briefingInput);

const mapContentPiece = (piece: any): ContentPiece => ({

});

id: uuidv4(),

title: piece.title,

subtitle: piece.subtitle,

cta: piece.cta,

caption: piece.caption,

imagePrompt: piece.imagePrompt,

status: 'pending',

const newProjectData: Omit<Project, 'id' | 'id_agencia' | 'created_at'> = {

eula: user.uid,

nome: formState.nome,

cliente: formState.client,

status: ProjectStatus.Briefing,

pecas_conteudo: briefing Output.pecas_conteudo.map(mapContentPiece),

pecas_carrossel: briefing Output.pecas_carrosseis?.flat().map(mapContentPiece),

tom_de_voz: briefing Output.tom_de_voz,

persona: briefingOutput.persona,

calendario_publicacao: briefingOutput.calendario_publicacao,

segment: formState.segment,

objective: formState.objective,

canais: formState.channels,

};

const createdProject = await supabaseService.addProject(agencyld, newProjectData);

if (subscription.plan_id $I===PLANO\_PADRAO\_ID)$ {

}

await supabaseService.incrementProjectCount();

await refreshUser(); // Refresh user data to get the new count

addToast( Projeto "\${createdProject.nome}" criado com sucesso!', 'success');

setlsModal Open(false);

setFormState(initial FormState);

--- PAGE 10 ---

navigate( /projects/\${createdProject.id}'); // Redireciona para o projeto recém-criado
 } catch (error) {

console.error("Failed to generate briefing:", error);

addToast( Falha ao gerar briefing: \${(error as Error).message} , "error");

} finally {

setls Generating(false);

}

};

const filtered Projects = useMemo(() => {

const baseProjects = projects.filter(p => {

if (viewMode === 'active') {

}

// Projetos ativos são todos, exceto os 'Posted' (arquivados)

return p.status !== ProjectStatus.Posted;

// Projetos arquivados são apenas os 'Posted'

return p.status === ProjectStatus.Posted;

});

if (!searchQuery) return baseProjects;

const lowercasedQuery = searchQuery.toLowerCase();

return baseProjects.filter(p =>

);

p.nome.toLowerCase().includes (lowercased Query) ||

p.cliente.toLowerCase().includes (lowercased Query)

}, [projects, searchQuery, viewMode]);

return (

<div className="flex flex-col h-full">

<Header />

<div className="flex-1 p-6 overflow-y-auto">

<div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">

<div className="flex items-baseline gap-4">

<h1 className="text-3xl font-bold text-white">Projetos</h1>
 isStandardPlan && (

<div title="Projetos criados este mês" className={ flex items-center gap-2

text-sm font-medium glass-panel px-3 py-1.5 rounded-full border transition-colors
 \${counterColorClass}}>

<Layers size={14} />

<span>{projectCount} / {LIMITE_PROJETOS}</span>

</div>

)}

</div>

<div className="flex gap-2 w-full sm:w-auto">

--- PAGE 11 ---


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="relative flex-grow sm:flex-grow-0">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2
 text-gray-500" />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <input
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 type="text"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 placeholder="Buscar por nome ou cliente..."
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 value={searchQuery}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 onChange={(e) => setSearchQuery(e.target.value)}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 className="w-full bg-white/5 border border-white/10 text-white rounded-md
 pl-10 pr-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)]"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Button onClick={() => setIsModalOpen(true)}>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <PlusCircle size={16} className="mr-2"/> Novo Projeto
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </Button>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="flex border-b border-white/10 mb-6">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <button onClick={() => setViewMode('active')} className={'py-2 px-4 text-lg
 \${viewMode === 'active' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' :
 'text-gray-400'}`}>Ativos</button>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <button onClick={() => setViewMode('archived')} className={'py-2 px-4 text-lg
 \${viewMode === 'archived' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]'
 : 'text-gray-400'}`}>Arquivados</button>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {loading?(
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="flex justify-center mt-10"><Spinner /></div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ): filteredProjects.length > 0? (
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {filteredProjects.map(project => (
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <ProjectCard key={project.id} project={project} />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ))}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ):(
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="text-center text-gray-500 py-20">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Frown size={48} className="mx-auto mb-4"/>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <p className="text-lg">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {viewMode === 'active' ? 'Nenhum projeto ativo encontrado.' : 'Nenhum
 projeto arquivado.'}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </p>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <p className="text-sm">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

--- PAGE 12 ---


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {searchQuery ? 'Tente ajustar sua busca.' : (viewMode === 'active' ? 'Crie um
 novo projeto para começar.' : 'Projetos finalizados aparecerão aqui.')}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </p>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 )}
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false);
 setFormState(initialFormState); }}>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <form onSubmit={handleGenerateBriefing} className="space-y-4">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <p className="text-sm text-gray-400 mb-4">Preencha os detalhes abaixo para
 que a IA crie um briefing completo e as peças de conteúdo iniciais.</p>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Input name="nome" label="Nome do Projeto" value={formState.nome}
 onChange={handleInputChange} required />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Input name="client" label="Nome do Cliente" value={formState.client}
 onChange={handleInputChange} required />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Input name="segment" label="Segmento do Cliente" value={formState.segment}
 onChange={handleInputChange} placeholder="Ex: Moda sustentável, Comida vegana" required />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {/* Componente AudioInput Refatorado */}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <AudioInput
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 id="objective"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 label="Briefing Detalhado do Projeto"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 subtext="Use sua voz para detalhar o briefing."
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 value={formState.objective}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 onChange={handleTextAreaChange}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 placeholder="Ex: Clínica de estética focada em rejuvenescimento. Falar sobre os
 benefícios do tratamento X, mostrar antes e depois (conceitual), e criar uma promoção para
 novos clientes."
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 required
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 rows={4}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {/* Fim do Componente AudioInput */}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="mt-4">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <label className="block text-sm font-medium text-gray-300 mb-1">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 Contexto Adicional (Opcional)
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </label>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <p className="text-xs text-gray-500 mb-2">Anexe um documento (.pdf, .txt) ou
 imagem (.png, .jpg) com informações sobre o cliente. Você pode enviar prints do Instagram
 para a IA ter uma base do que já vem sido criado.</p>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

--- PAGE 13 ---


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {formState.documentFile ? (
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="flex items-center justify-between bg-white/10 p-3
 rounded-md">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="flex items-center gap-3 overflow-hidden">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <FileText size={20} className="text-[var(--btn-grad-from)] flex-shrink-0"
 />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <span className="text-sm text-gray-200
 truncate">{formState.documentFile.name}</span>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Button type="button" variant="ghost" size="sm"
 onClick={handleRemoveFile} className="p-1 h-auto flex-shrink-0">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <X 
 size={16} />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </Button>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ):(
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
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
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 className={'flex flex-col items-center justify-center w-full h-24
 border-2 border-dashed rounded-lg cursor-pointer transition-colors \${isParsingFile ?
 'border-gray-600 bg-gray-800': 'border-white/20 hover:border-[var(--btn-grad-to)]
 hover:bg-white/5'}'}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 >
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 Example
 {isParsingFile?(
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Spinner />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ):(
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Upload size={24} className="text-gray-400" />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <p className="text-sm text-gray-400 mt-2">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <span className="font-semibold text-[var(--btn-grad-from)]">Clique
 para enviar</span> ou arraste e solte
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </p>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 )}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </label>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 )}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {/* Componente AudioInput Refatorado */}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

--- PAGE 14 ---


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {/* Componente AudioInput Refatorado */}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <AudioInput
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 id="specificPostRequest"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 label="Deseja algum post personalizado? (Opcional)"
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 subtext="Descreva por áudio os posts que deseja."
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 value={formState.specificPostRequest}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 onChange={handleTextAreaChange}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 placeholder="Ex: Preciso de 2 posts personalizados, um para o Dia das Mães e
 outro sobre nossa promoção de inverno."
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 rows={3}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {/* Fim do Componente AudioInput */}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
 
 
 
 
 
 
 
 
 
 
 
 m 
 
 
 
 
 
 
 
 
 
 
 
 
 <div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <label className="block text-sm font-medium text-gray-300 mb-1">Qtd. Posts
 Estáticos</label>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <input type="range" name="contentCou

--- PAGE 15 ---


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <label className="block text-sm font-medium text-gray-300 mb-1">Qtd.
 Carrosséis (0 a 5)</label>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <input type="range" name="carouselCount" min="0" max="5"
 value={formState.carouselCount} onChange={handleInputChange} className="w-full" />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="text-center text-sm text-gray-400">{formState.carouselCount}
 carrosséis</div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 {Number(formState.carouselCount) > 0 && (
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="pl-6 animate-fadeIn">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <label className="block text-sm font-medium text-gray-300 mb-1">Qtd.
 Lâminas por Carrossel</label>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <input type="range" name="carouselSlideCount" min="2" max="10"
 value={formState.carouselSlideCount} onChange={handleInputChange} className="w-full" />
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="text-center text-sm
 text-gray-400">{formState.carouselSlideCount} lâminas</div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 )}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <div className="pt-4 flex justify-end">
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <Button type="submit" isLoading={isGenerating}>Gerar Briefing e
 Conteúdo</Button>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 </form>
 
 
 
 
 
 
 
 
 
 
 
 
 </Modal>
 
 
 
 
 
 
 
 
 
 
 </div>
 
 
 
 
 
 
 
 
 
 
 );
 
 
 
 
 
 
 
 
 
 };
 
 
 
 
 
 
 
 
 
 
 export default ProjectsPage;



import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

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

// --- CORREÇÃO: LAZY IMPORT DE PDFJS-DIST ---
// Removemos a importação fixa (import * as pdfjsLib from 'pdfjs-dist';)
// para evitar o erro de Rollup no ambiente de build (SSR/Vercel).
// Agora, a biblioteca será carregada dinamicamente (client-side) abaixo.

// Tipo para armazenar a biblioteca carregada dinamicamente
type PdfJsLib = typeof import('pdfjs-dist');

const ProjectsPage: React.FC = () => {
    const { projects, createProject, updateProject, deleteProject } = useData();
    const { userId } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Estado para armazenar a biblioteca pdfjsLib carregada
    const [pdfjsLib, setPdfjsLib] = useState<PdfJsLib | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(true); // Indica se o PDFjs ainda está carregando

    // Efeito para carregar o pdfjs-dist dinamicamente
    useEffect(() => {
        // Carrega a biblioteca dinamicamente. Isso resolve o problema de Rollup/Build.
        import('pdfjs-dist')
            .then(pdfjs => {
                // Configura o caminho do worker para o pdf.js para processamento em segundo plano.
                pdfjs.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
                
                setPdfjsLib(pdfjs);
                setIsLoadingPdf(false);
            })
            .catch(error => {
                console.error("Erro ao carregar pdfjs-dist:", error);
                setIsLoadingPdf(false);
                showToast('Erro ao carregar módulo PDF. Funções de PDF não estarão disponíveis.', 'error');
            });
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [formState, setFormState] = useState({
        name: '',
        targetAudience: '',
        platform: '',
        contentGoal: '',
        tone: '',
        videoCount: 1,
        staticCount: 1,
        carouselCount: 0,
        briefingSummary: '',
        pdfFileName: '',
        pdfFileUrl: '',
    });

    // ... (restante do código omitido para concisão, mas o PDF está aqui no próximo bloco)
    
    // Funções de PDF que agora precisam checar se pdfjsLib está carregado

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !pdfjsLib) {
            showToast('PDF Reader ainda não carregado ou nenhum arquivo selecionado.', 'warning');
            return;
        }

        const file = event.target.files[0];
        if (file.type !== 'application/pdf') {
            showToast('Por favor, selecione um arquivo PDF.', 'error');
            return;
        }

        const arrayBuffer = await file.arrayBuffer();
        
        try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => ('str' in item) ? item.str : '').join(' ');
                fullText += pageText + '\n';
            }

            // Define o resumo inicial (briefingSummary) com o texto completo do PDF
            setFormState(prev => ({ 
                ...prev, 
                briefingSummary: fullText,
                pdfFileName: file.name,
                pdfFileUrl: URL.createObjectURL(file) // Opcional, para pré-visualização ou referência
            }));
            
            showToast('PDF processado com sucesso! O texto foi adicionado ao Resumo do Briefing.', 'success');

        } catch (error) {
            console.error("Erro ao processar PDF:", error);
            showToast('Erro ao ler o arquivo PDF.', 'error');
        }
    };
    
    // ... (restante do código)

    return (
        // ... (seu JSX do componente)

        <div className="p-4 sm:p-6 lg:p-8">
            <Header title="Meus Projetos" subtitle="Crie, gerencie e acompanhe seus projetos de conteúdo." />

            {/* Mensagem de carregamento do PDFjs */}
            {isLoadingPdf && (
                <div className="text-center p-4 text-sm text-yellow-400">
                    <Spinner size={4} className="inline mr-2" /> 
                    Carregando módulo PDF. Aguarde...
                </div>
            )}
            
            {/* O conteúdo principal do componente, onde você usa o pdfjsLib */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Editar Projeto' : 'Novo Projeto'}>
                {/* ... conteúdo do modal, incluindo o campo de upload de PDF */}
                
                {/* O botão de upload de PDF deve estar desabilitado se pdfjsLib não estiver carregado */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Upload de Briefing (PDF)</label>
                    <div className="flex items-center space-x-2">
                        <Input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="flex-grow"
                            disabled={!pdfjsLib || isLoadingPdf} // Desabilita se o módulo não estiver pronto
                        />
                        {formState.pdfFileName && (
                            <span className="text-sm text-gray-400 truncate">{formState.pdfFileName}</span>
                        )}
                        {/* Indicador de status do PDFjs */}
                        {isLoadingPdf && <Spinner size={4} />}
                        {!pdfjsLib && !isLoadingPdf && (
                             <Alert Triangle size={16} className="text-red-500" title="Módulo PDF com erro" />
                        )}
                    </div>
                </div>
                
                {/* ... restante do formulário */}
            </Modal>
        </div>
    );
};

export default ProjectsPage;


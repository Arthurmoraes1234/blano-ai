import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Project, ProjectStatus } from '../../types';
import Header from '../../components/Header';
import { supabaseService } from '../../services/firestoreService';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const KanbanColumn: React.FC<{
  title: string;
  status: ProjectStatus;
  projects: Project[];
  onDrop: (projectId: string, newStatus: ProjectStatus) => void;
}> = ({ title, status, projects, onDrop }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const projectId = e.dataTransfer.getData("projectId");
    onDrop(projectId, status);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[300px] glass-panel rounded-lg p-4 flex flex-col transition-all duration-300 ${isOver ? 'bg-white/10' : ''}`}
    >
      <h3 className="font-bold text-lg mb-4 text-white border-b-2 border-[var(--btn-grad-from)] pb-2 flex-shrink-0">{title}</h3>
      <div className="space-y-4 overflow-y-auto">
        {projects.map(project => (
          <KanbanCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && <div className="text-center text-gray-500 pt-10">Nenhum projeto aqui.</div>}
      </div>
    </div>
  );
};

const KanbanCard: React.FC<{ project: Project }> = ({ project }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, projectId: number) => {
        e.dataTransfer.setData("projectId", String(projectId));
    };

    return (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, project.id)}
            className="glass-panel p-4 rounded-md cursor-pointer hover:border-white/20"
        >
            <Link to={`/projects/${project.id}`}>
                <h4 className="font-bold text-white">{project.nome}</h4>
                <p className="text-sm text-gray-400">{project.cliente}</p>
                 {project.data_entrega && (
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                        <Clock size={12} className="mr-1.5" />
                        <span>{new Date(project.data_entrega).toLocaleDateString()}</span>
                    </div>
                )}
                {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {project.tags.map(tag => (
                            <span key={tag} className="bg-white/10 text-xs text-gray-300 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
            </Link>
        </div>
    );
};


const CrmPage: React.FC = () => {
    const { projects: contextProjects, loading, updateProject } = useData();
    const { agencyId } = useAuth();
    const { addToast } = useToast();

    const [projects, setProjects] = useState<Project[]>(contextProjects);

    useEffect(() => {
        setProjects(contextProjects);
    }, [contextProjects]);

    const handleStatusUpdate = async (projectIdStr: string, newStatus: ProjectStatus) => {
        const projectIdNum = Number(projectIdStr);
        const originalProjects = [...projects];

        // Optimistic UI update
        setProjects(prevProjects =>
            prevProjects.map(p =>
                p.id === projectIdNum ? { ...p, status: newStatus } : p
            )
        );

        const project = originalProjects.find(p => p.id === projectIdNum);
        if (!project || !agencyId) {
            setProjects(originalProjects); // Revert if project is not found
            addToast("Ocorreu um erro ao mover o projeto.", "error");
            return;
        }

        try {
            const updateData: Partial<Project> = { status: newStatus };
            if (newStatus === ProjectStatus.Posted && project.status !== ProjectStatus.Posted) {
                updateData.data_conclusao = new Date();
                supabaseService.addNotification({
                    idAgencia: agencyId,
                    message: `✅ O projeto ${project.nome} foi finalizado com sucesso.`,
                    type: 'success',
                    link: `/projects/${project.id}`,
                    lido: false
                });
            } else if (project.status === ProjectStatus.Posted && newStatus !== ProjectStatus.Posted) {
                updateData.data_conclusao = undefined;
            }
            await updateProject(projectIdNum, updateData);
        } catch (error) {
            console.error("Failed to update project status:", error);
            // Error toast is handled in DataContext, so we just revert the UI
            setProjects(originalProjects); // Revert UI on failure
        }
    };

    const columns: { title: string, status: ProjectStatus }[] = [
        { title: 'Briefing', status: ProjectStatus.Briefing },
        { title: 'Produzindo', status: ProjectStatus.Producing },
        { title: 'Aprovação', status: ProjectStatus.Approval },
        { title: 'Ajustes', status: ProjectStatus.Adjustments },
        { title: 'Postado', status: ProjectStatus.Posted },
    ];

    return (
        <div className="flex flex-col h-full">
            <Header />
            <div className="flex-1 p-6 overflow-x-auto">
                {loading && projects.length === 0 ? (
                    <div className="text-center">Carregando...</div>
                ) : (
                    <div className="flex space-x-6 h-full">
                        {columns.map(col => (
                            <KanbanColumn
                                key={col.status}
                                title={col.title}
                                status={col.status}
                                projects={projects.filter(p => p.status === col.status)}
                                onDrop={handleStatusUpdate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrmPage;
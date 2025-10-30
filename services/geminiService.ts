import { GoogleGenAI, Type } from "@google/genai";

// Safely access the API key, checking if 'process' and 'process.env' exist.
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY)
  ? process.env.API_KEY
  : null;


if (!API_KEY) {
  console.warn("API_KEY for Gemini not found. AI features will fall back to mock data.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

interface ProjectBriefingInput {
  client: string;
  segment: string;
  objective: string;
  channels: string[];
  contentCount: number;
  specificPostRequest?: string;
  contentLength?: 'compacto' | 'médio' | 'longo';
  carouselCount?: number;
  carouselSlideCount?: number;
  documentContext?: string;
}

interface ContentPieceOutput {
  title: string;
  subtitle: string;
  cta: string;
  caption: string;
  imagePrompt: string;
}

interface ProjectBriefingOutput {
  tom_de_voz: string;
  persona: string;
  calendario_publicacao: string;
  pecas_conteudo: ContentPieceOutput[];
  pecas_carrosseis?: ContentPieceOutput[][];
}

// Nova interface para o assistente de IA
interface OptimizeContentInput {
    text: string;
    command: 'variations' | 'shorten' | 'impact' | 'rewrite_fun' | 'rewrite_formal' | 'add_hashtags';
    context: {
        client: string;
        objective: string;
    };
}

// Helper não exportado para converter um arquivo para o formato que a API do Gemini espera.
const fileToGenerativePart = async (file: File | Blob) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};


const getMockBriefing = (input: ProjectBriefingInput): ProjectBriefingOutput => {
    const mockPieces = Array.from({ length: input.contentCount }, (_, i) => ({
      title: `Título ${input.contentLength || 'médio'} Mock ${i + 1}`,
      subtitle: `Este é um subtítulo de tamanho ${input.contentLength || 'médio'} para o conteúdo ${i + 1}`,
      cta: `Call to Action para o conteúdo ${i + 1}`,
      caption: `Esta é uma legenda completa gerada como mock para o conteúdo sobre ${input.objective}. ${input.specificPostRequest && i === 0 ? `Este post é sobre o pedido específico: ${input.specificPostRequest}.` : ''} ${input.documentContext ? 'Esta legenda foi informada pelo contexto do documento.' : ''}`,
      imagePrompt: `Um prompt de imagem para IA sobre: ${input.objective} no estilo de ${input.segment}`
    }));

    let mockCarousels: ContentPieceOutput[][] | undefined = undefined;
    if (input.carouselCount && input.carouselCount > 0 && input.carouselSlideCount) {
        mockCarousels = Array.from({ length: input.carouselCount }, (_, c_idx) => 
            Array.from({ length: input.carouselSlideCount }, (_, s_idx) => ({
                title: `Carrossel ${c_idx + 1} - Lâmina ${s_idx + 1}`,
                subtitle: `Subtítulo da lâmina ${s_idx + 1}`,
                cta: `CTA da lâmina ${s_idx + 1}`,
                caption: `Conteúdo da lâmina ${s_idx + 1} do carrossel ${c_idx + 1}.`,
                imagePrompt: `Imagem para a lâmina ${s_idx + 1} do carrossel ${c_idx + 1}`
            }))
        );
    }

    return {
      tom_de_voz: "Institucional e Confiável (Mock)",
      persona: "Público-alvo detalhado (persona) gerado como mock para o cliente. Foco em seus interesses e dores relacionados a " + input.segment,
      calendario_publicacao: "Calendário de publicação sugerido (mock):\n- Conteúdo 1: Segunda-feira\n- Conteúdo 2: Quarta-feira\n- Conteúdo 3: Sexta-feira",
      pecas_conteudo: mockPieces,
      pecas_carrosseis: mockCarousels,
    };
};

const generateProjectBriefing = async (input: ProjectBriefingInput): Promise<ProjectBriefingOutput> => {
  if (!ai) {
    console.warn("Gemini AI client not initialized or API key missing. Falling back to mock data.");
    return getMockBriefing(input);
  }
  
  const documentContextPromptSection = input.documentContext
    ? `
    **CONTEXTO ADICIONAL (Extraído de documento do cliente):**
    ---
    ${input.documentContext.substring(0, 15000)}
    ---
    
    **INSTRUÇÃO CRÍTICA:** Use o CONTEXTO ADICIONAL acima como a principal fonte de verdade para entender o cliente. O tom de voz, detalhes de produtos/serviços, e informações da persona DEVEM ser extraídos ou fortemente inspirados por este documento para criar o briefing e as peças de conteúdo. Reflita o estilo e as informações do documento no seu output.
    `
    : '';

  const carouselPromptSection = input.carouselCount && input.carouselCount > 0
    ? `
    5.  **pecas_carrosseis**: Crie exatamente ${input.carouselCount} carrosséis distintos. Para cada carrossel, siga ESTRITAMENTE as seguintes regras para garantir que ele funcione como uma peça coesa e não como posts separados:

        - **FLUXO NARRATIVO:** Cada carrossel deve contar uma história ou desenvolver um argumento em sequência, com cada lâmina conectada à anterior. O carrossel completo deve ter começo (gancho), meio (desenvolvimento) e fim (CTA).
        - **ESTRUTURA POR LÂMINA:** Você irá gerar ${input.carouselSlideCount} lâminas para cada carrossel. Para cada lâmina (que é um objeto no array), preencha os campos da seguinte forma:
            - **title**: O texto principal/headline daquela lâmina específica. (Ex: "Estabilidade Máxima").
            - **subtitle**: Um texto de apoio curto que complementa o título da lâmina. (Ex: "Transmissão 100% via luz, sem interferências.").
            - **cta**: Deixe este campo VAZIO para todas as lâminas, EXCETO a última. Na última lâmina, coloque a chamada para ação final do carrossel. (Ex: "Ligue agora e saiba mais!").
            - **caption**: Este é o campo mais importante. Gere a legenda COMPLETA para a postagem do Instagram (com hashtags) e coloque-a SOMENTE no campo 'caption' da PRIMEIRA lâmina. Para TODAS as outras lâminas (da segunda em diante), deixe o campo 'caption' como uma string vazia ("").
            - **imagePrompt**: Crie um prompt de imagem para cada lâmina. Adicione uma instrução para o designer criar um "elemento de fluxo visual", como uma linha ou forma que se conecta da lâmina atual para a próxima, para incentivar o deslize.

        - **DIFERENCIAÇÃO:** É CRUCIAL que o título de cada lâmina indique a qual carrossel pertence e sua posição (ex: "Carrossel 1: Título da Lâmina", "Carrossel 2: Título da Lâmina").
    `
    : '';

  const prompt = `
    Você é um estrategista de marketing digital sênior para uma agência. Sua tarefa é criar um briefing completo para um novo projeto de cliente.
    
    ${documentContextPromptSection}
    
    Com base nas informações a seguir (e no contexto do documento, se fornecido), gere a estratégia e o conteúdo.

    - Nome da empresa/cliente: ${input.client}
    - Segmento/mercado: ${input.segment}
    - Objetivo do conteúdo: ${input.objective}
    - Canais de atuação: ${input.channels.join(', ')}
    - Quantidade de posts estáticos: ${input.contentCount}
    - Preferência de tamanho para títulos e subtítulos: ${input.contentLength || 'médio'}
    ${input.specificPostRequest ? `- Pedido de post específico: ${input.specificPostRequest}` : ''}
    ${input.carouselCount && input.carouselCount > 0 ? `- Adicionalmente, gerar ${input.carouselCount} carrossel(éis) com ${input.carouselSlideCount} lâminas cada.` : ''}

    Seu output deve ser um JSON. Siga estritamente a estrutura definida, usando snake_case para todas as chaves.
    
    **REGRA DE CAPITALIZAÇÃO (MUITO IMPORTANTE):** Todos os textos gerados (titles, subtitles, captions, etc.) devem seguir as regras de capitalização padrão da língua portuguesa. Apenas a primeira letra de uma frase e nomes próprios devem ser maiúsculos. NÃO use "Title Case" (onde cada palavra começa com letra maiúscula) em nenhum campo. A escrita deve ser natural.
    
    INSTRUÇÕES:
    1.  **tom_de_voz**: Defina um tom de voz apropriado (ex: institucional, descontraído, persuasivo).
    2.  **persona**: Descreva a persona detalhadamente (público-alvo).
    3.  **calendario_publicacao**: Crie um calendário sugerido de publicações em formato de texto simples.
    4.  **pecas_conteudo**: Crie exatamente ${input.contentCount} peças de conteúdo estático. Para cada peça:
        -   **title**: Um título forte e chamativo.
        -   **subtitle**: Um subtítulo complementar.
        -   **IMPORTANTE**: O tamanho do 'title' e 'subtitle' deve ser '${input.contentLength || 'médio'}'. 'Compacto' significa muito curto e direto. 'Longo' significa mais detalhado e elaborado.
        ${input.specificPostRequest ? `- **IMPORTANTE**: Pelo menos uma das peças de conteúdo DEVE ser sobre o tema específico: "${input.specificPostRequest}".` : ''}
        -   **cta**: Uma chamada para ação (Call to Action) clara e direta.
        -   **caption**: Uma legenda completa e pronta para postar, adaptada ao nicho e objetivo. Use hashtags relevantes.
        -   **imagePrompt**: Um prompt detalhado para uma IA de geração de imagem criar a arte para o post.
    ${carouselPromptSection}
  `;
  
  const contentPieceSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'O título da peça de conteúdo.' },
      subtitle: { type: Type.STRING, description: 'Um subtítulo complementar que expande o título.' },
      cta: { type: Type.STRING, description: 'Uma chamada para ação (Call to Action) clara e direta.' },
      caption: { type: Type.STRING, description: 'A legenda completa e pronta para a postagem.' },
      imagePrompt: { type: Type.STRING, description: 'Um prompt para uma IA de geração de imagem.' }
    },
    required: ['title', 'subtitle', 'cta', 'caption', 'imagePrompt']
  };

  const responseSchemaProperties: any = {
    tom_de_voz: { type: Type.STRING, description: 'O tom de voz da marca (ex: institucional, descontraído).' },
    persona: { type: Type.STRING, description: 'Descrição detalhada do público-alvo (persona).' },
    calendario_publicacao: { type: Type.STRING, description: 'Um calendário de publicação sugerido em formato de texto.' },
    pecas_conteudo: {
      type: Type.ARRAY,
      description: `Uma lista de exatamente ${input.contentCount} ideias de peças de conteúdo estático.`,
      items: contentPieceSchema
    }
  };

  if (input.carouselCount && input.carouselCount > 0) {
    responseSchemaProperties.pecas_carrosseis = {
        type: Type.ARRAY,
        description: `Uma lista de ${input.carouselCount} carrosséis. Cada item da lista é outro array contendo as ${input.carouselSlideCount} lâminas desse carrossel.`,
        items: {
            type: Type.ARRAY,
            items: contentPieceSchema,
        }
    };
  }
  
  const responseSchema = {
      type: Type.OBJECT,
      properties: responseSchemaProperties,
      required: ['tom_de_voz', 'persona', 'calendario_publicacao', 'pecas_conteudo']
    };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as ProjectBriefingOutput;
  } catch (error) {
    console.error("Error calling Gemini API. Falling back to mock data:", error);
    return getMockBriefing(input);
  }
};

const optimizeContent = async (input: OptimizeContentInput): Promise<{ result: string | string[] }> => {
    if (!ai) {
        console.warn("Gemini AI client not initialized or API key missing. Falling back to mock data.");
        if (input.command === 'variations') return { result: [`Variação Mock 1 para "${input.text}"`, `Variação Mock 2 para "${input.text}"`] };
        return { result: `Resultado mock para o comando '${input.command}' no texto: "${input.text}"` };
    }

    let commandDescription = '';
    let jsonOutputInstructions = '';
    let responseSchema: any = { type: Type.OBJECT, properties: { result: { type: Type.STRING } }, required: ['result'] };

    switch (input.command) {
        case 'variations':
            commandDescription = 'Gere 5 variações criativas e diferentes para o seguinte texto. As variações devem manter o objetivo principal, mas explorar ângulos diferentes.';
            responseSchema = { type: Type.OBJECT, properties: { result: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['result'] };
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém um array de strings com as 5 variações geradas.';
            break;
        case 'shorten':
            commandDescription = 'Reescreva o seguinte texto para ser mais curto, conciso e direto, mantendo a mensagem principal.';
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém a string do texto encurtado.';
            break;
        case 'impact':
            commandDescription = 'Reescreva o seguinte texto para ser mais impactante e persuasivo, usando palavras mais fortes e uma estrutura que prenda a atenção.';
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém a string do texto mais impactante.';
            break;
        case 'rewrite_fun':
            commandDescription = 'Reescreva o seguinte texto com um tom mais divertido, descontraído e informal.';
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém a string do texto reescrito em tom divertido.';
            break;
        case 'rewrite_formal':
            commandDescription = 'Reescreva o seguinte texto com um tom mais formal, profissional e institucional.';
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém a string do texto reescrito em tom formal.';
            break;
        case 'add_hashtags':
            commandDescription = 'Analise o seguinte texto e adicione uma lista de 5 a 7 hashtags altamente relevantes no final. As hashtags devem ser separadas por espaços.';
            jsonOutputInstructions = 'Sua resposta DEVE ser um objeto JSON com uma única chave "result", que contém a string do texto original com as novas hashtags adicionadas no final.';
            break;
    }

    const prompt = `
        Você é um assistente de IA especialista em redação publicitária.
        
        **Contexto do Projeto:**
        - Cliente: ${input.context.client}
        - Objetivo Principal: ${input.context.objective}

        **REGRA DE CAPITALIZAÇÃO (MUITO IMPORTANTE):** O texto resultante deve seguir as regras de capitalização padrão da língua portuguesa. Apenas a primeira letra de uma frase e nomes próprios devem ser maiúsculos. NÃO use "Title Case".

        **Tarefa:**
        ${commandDescription}

        **Texto Original:**
        "${input.text}"

        **Formato da Resposta:**
        ${jsonOutputInstructions}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error(`Error optimizing content with command '${input.command}':`, error);
        throw new Error("A IA não conseguiu processar sua solicitação. Tente novamente.");
    }
};

const getTextFromImage = async (file: File): Promise<string> => {
    if (!ai) {
        console.warn("Gemini AI client not initialized. Cannot process image.");
        return "Análise de imagem mock: A imagem parece ser uma captura de tela do Instagram com um esquema de cores pastel e fontes serifadas elegantes.";
    }

    const imagePart = await fileToGenerativePart(file);

    const prompt = "Analise esta imagem. Extraia e transcreva todo o texto visível. Se parecer uma captura de tela de rede social (como Instagram), descreva também o estilo visual, a paleta de cores, o tipo de fonte e a estética geral das postagens para que eu possa entender a identidade da marca.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: prompt }] },
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for image analysis:", error);
        throw new Error("A IA não conseguiu analisar a imagem. Tente novamente com uma imagem diferente.");
    }
};

const transcribeAudio = async (audioFile: File | Blob): Promise<string> => {
    if (!ai) {
        console.warn("Gemini AI client not initialized. Cannot transcribe audio.");
        return "Transcrição mock: clínica de estética focada em rejuvenescimento.";
    }

    const audioPart = await fileToGenerativePart(audioFile);

    const prompt = "Transcreva o áudio a seguir da forma mais fiel possível. O áudio está em português do Brasil.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [audioPart, { text: prompt }] },
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for audio transcription:", error);
        throw new Error("A IA não conseguiu transcrever o áudio. Tente novamente.");
    }
};


export const geminiService = {
  generateProjectBriefing,
  optimizeContent,
  getTextFromImage,
  transcribeAudio,
};
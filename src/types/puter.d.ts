// Puter.js Type Declarations
interface PuterAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface PuterAIChatOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface PuterAIStreamPart {
  text?: string;
}

interface PuterAI {
  chat(
    prompt: string | PuterAIMessage[],
    options?: PuterAIChatOptions
  ): Promise<string | AsyncIterable<PuterAIStreamPart>>;
  
  chat(
    prompt: string,
    imageUrl: string,
    options?: PuterAIChatOptions
  ): Promise<string>;
  
  txt2img(prompt: string, options?: { model?: string }): Promise<HTMLImageElement>;
  txt2speech(text: string, options?: { provider?: string }): Promise<HTMLAudioElement>;
}

interface Puter {
  ai: PuterAI;
  print(content: string): void;
}

declare const puter: Puter;

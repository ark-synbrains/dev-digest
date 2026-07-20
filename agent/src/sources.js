/**
 * Free public sources for /dev/digest lanes.
 * No API keys required.
 *
 * - Hacker News (Algolia) — high-signal tech discussion
 * - Dev.to — tagged developer articles
 * - Curated RSS — primary company / research blogs
 */

export const SECTION_META = {
  model: { label: 'models & research' },
  algorithm: { label: 'algorithms & systems' },
  product: { label: 'product & company releases' },
};

/** Per-lane search queries for HN Algolia */
export const HN_QUERIES = {
  model: [
    'LLM OR "language model" OR "foundation model" OR "open weights"',
    'GPT OR Claude OR Gemini OR Llama OR Mistral OR "diffusion model"',
  ],
  algorithm: [
    'algorithm OR compiler OR database OR distributed OR "systems paper"',
    'Kubernetes OR Rust OR "query engine" OR "vector database" OR inference',
  ],
  product: [
    'released OR launch OR "now available" OR GA OR "generally available"',
    'OpenAI OR Anthropic OR Google OR AWS OR Microsoft OR NVIDIA product',
  ],
};

/** Dev.to tags per lane */
export const DEVTO_TAGS = {
  model: ['ai', 'machinelearning', 'llm'],
  algorithm: ['algorithms', 'systems', 'performance', 'rust'],
  product: ['news', 'opensource', 'webdev'],
};

/** Official / primary RSS feeds per lane */
export const RSS_FEEDS = {
  model: [
    { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
    { name: 'Google Research', url: 'https://blog.research.google/feeds/posts/default?alt=rss' },
    { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml' },
  ],
  algorithm: [
    { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
    { name: 'Engineering at Meta', url: 'https://engineering.fb.com/feed/' },
    { name: 'Netflix TechBlog', url: 'https://netflixtechblog.com/feed' },
    { name: 'Kubernetes Blog', url: 'https://kubernetes.io/feed.xml' },
  ],
  product: [
    { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
    { name: 'AWS News', url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/' },
    { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/' },
    { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' },
  ],
};

/** Soft keyword filters so product/model lanes stay on-topic */
export const LANE_KEYWORDS = {
  model: [
    'model',
    'llm',
    'gpt',
    'claude',
    'gemini',
    'llama',
    'mistral',
    'diffusion',
    'transformer',
    'benchmark',
    'weights',
    'training',
    'inference',
    'multimodal',
    'research',
    'paper',
  ],
  algorithm: [
    'algorithm',
    'system',
    'distributed',
    'database',
    'compiler',
    'runtime',
    'performance',
    'latency',
    'throughput',
    'protocol',
    'kernel',
    'query',
    'index',
    'cache',
    'rust',
    'go ',
    'infrastructure',
  ],
  product: [
    'launch',
    'released',
    'release',
    'announce',
    'available',
    'ga ',
    'preview',
    'product',
    'platform',
    'api',
    'sdk',
    'feature',
    'hardware',
    'chip',
    'gpu',
  ],
};

import { RichOutput } from "@shared/schema";

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  published: string;
  url: string;
}

export class ArxivService {
  private baseUrl = 'http://export.arxiv.org/api/query';

  async searchPapers(keywords: string[], maxResults: number = 10): Promise<RichOutput> {
    try {
      // Construct search query
      const searchTerms = keywords.map(k => `all:"${k}"`).join(' AND ');
      const params = new URLSearchParams({
        search_query: searchTerms,
        start: '0',
        max_results: maxResults.toString(),
        sortBy: 'relevance',
        sortOrder: 'descending'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivXML(xmlText);
      
      return {
        agent: "SearchAgent",
        result: `Found ${papers.length} relevant papers from ArXiv`,
        confidence: papers.length > 0 ? 0.9 : 0.3,
        sources: papers.map(p => p.url),
        warnings: papers.length === 0 ? ["No papers found for search terms"] : [],
        metadata: { papers, searchTerms: keywords }
      };
    } catch (error) {
      return {
        agent: "SearchAgent",
        result: `Error searching ArXiv: ${error.message}`,
        confidence: 0,
        sources: [],
        warnings: ["ArXiv search failed"],
        metadata: { error: error.message, searchTerms: keywords }
      };
    }
  }

  private parseArxivXML(xmlText: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    
    try {
      // Basic XML parsing - in production, use a proper XML parser
      const entries = xmlText.split('<entry>').slice(1); // Skip first empty split
      
      for (const entry of entries) {
        const id = this.extractXMLValue(entry, 'id');
        const title = this.extractXMLValue(entry, 'title').replace(/\s+/g, ' ').trim();
        const abstract = this.extractXMLValue(entry, 'summary').replace(/\s+/g, ' ').trim();
        const published = this.extractXMLValue(entry, 'published');
        
        // Extract authors
        const authorMatches = entry.match(/<author><name>(.*?)<\/name><\/author>/g) || [];
        const authors = authorMatches.map(match => 
          match.replace(/<author><name>|<\/name><\/author>/g, '').trim()
        );
        
        // Extract categories
        const categoryMatches = entry.match(/term="([^"]+)"/g) || [];
        const categories = categoryMatches.map(match => 
          match.replace(/term="|"/g, '')
        );

        if (id && title && abstract) {
          papers.push({
            id: id.split('/').pop() || id,
            title,
            authors,
            abstract,
            categories,
            published,
            url: id
          });
        }
      }
    } catch (error) {
      console.error('Error parsing ArXiv XML:', error);
    }
    
    return papers;
  }

  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  async downloadPaper(url: string): Promise<Buffer | null> {
    try {
      // Convert abstract URL to PDF URL
      const pdfUrl = url.replace('/abs/', '/pdf/') + '.pdf';
      
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }
      
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error downloading paper:', error);
      return null;
    }
  }
}

export const arxivService = new ArxivService();

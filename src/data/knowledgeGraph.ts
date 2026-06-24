export type ConceptType = 'definition' | 'procedure' | 'principle' | 'example' | 'analogy';

export interface ConceptNode {
  id: string;
  name: string;
  type: ConceptType;
  introducedAt: number;
  lastReferencedAt: number;
  representations: {
    symbolic?: string;
    visual?: string;
    verbal?: string;
    numerical?: string;
  };
  commonMisconceptions: string[];
}

export type EdgeType =
  | 'PREREQUISITE'
  | 'DERIVES_FROM'
  | 'ANALOGOUS_TO'
  | 'CONTRASTS_WITH'
  | 'GENERALIZES'
  | 'EXAMPLE_OF';

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;
  explanation: string;
}

export interface KnowledgeGraph {
  concepts: Map<string, ConceptNode>;
  edges: GraphEdge[];
}

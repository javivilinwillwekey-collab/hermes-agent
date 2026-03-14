import fs from 'fs';
import { join } from 'path';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
}

export class SkillManager {
  private skillsPath: string;
  private skills: Map<string, Skill> = new Map();

  constructor(skillsPath: string = process.cwd()) {
    this.skillsPath = skillsPath;
    this.initializeSkills();
  }

  private initializeSkills() {
    const skillFiles = {
      'github': 'SKILL.md',
      'gog': 'gog.md',
      'mcp': 'mcp-integr.md',
      'fix': 'fix.md',
      'superpowers': 'superpowers.md'
    };

    for (const [id, filename] of Object.entries(skillFiles)) {
      const fullPath = join(this.skillsPath, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        this.skills.set(id, {
          id,
          name: id.toUpperCase(),
          description: `Habilidades de ${id}`,
          content
        });
      }
    }
  }

  public getSkill(id: string): Skill | undefined {
    return this.skills.get(id.toLowerCase());
  }

  public getAllSkillIds(): string[] {
    return Array.from(this.skills.keys());
  }

  public findRelevantSkills(query: string): string[] {
    const relevant: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [id, skill] of this.skills.entries()) {
      if (lowerQuery.includes(id) || skill.content.toLowerCase().includes(lowerQuery)) {
        relevant.push(id);
      }
    }
    return relevant;
  }
}

export const skillManager = new SkillManager();

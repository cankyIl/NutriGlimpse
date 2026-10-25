import {writeFile} from 'node:fs/promises';
import {nutritionEducationPolicy as policy,nutritionSources as sources,nutritionEducationCards as cards,metricEducation as comparisonNotes} from '../packages/core/src/nutritionEducation.ts';
await writeFile(new URL('../data/guidance/diabetes-education.json',import.meta.url),JSON.stringify({policy,sources,cards,comparisonNotes},null,2)+'\n');
console.log('Educational source register exported; no medical rules enabled.');

import '/src/register.ts';
import { setPresentationDictionary, defaultPresentationDictionary } from '../../../../src/index.js';
Object.assign(window, { fixtureAPI: { setPresentationDictionary, defaultPresentationDictionary } });

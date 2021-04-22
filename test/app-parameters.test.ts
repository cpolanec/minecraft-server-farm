import { EnvVarError } from 'env-var';
import AppParameters from '../lib/app-parameters';

test('validate error on missing env variable', () => {
  expect(() => AppParameters.init('.missing')).toThrowError(EnvVarError);
});

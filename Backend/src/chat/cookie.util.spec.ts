import { parseCookieHeader } from './cookie.util';

describe('parseCookieHeader', () => {
  it('lee varias cookies', () => {
    expect(parseCookieHeader('access_token=abc.def.ghi; theme=dark')).toEqual({
      access_token: 'abc.def.ghi',
      theme: 'dark',
    });
  });

  it('decodifica valores y quita comillas', () => {
    expect(parseCookieHeader('a=hola%20mundo; b="x y"')).toEqual({ a: 'hola mundo', b: 'x y' });
  });

  it('tolera encabezados vacíos o mal formados', () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
    expect(parseCookieHeader('sinvalor; =x; ok=1; bad=%E0%A4%A')).toEqual({
      ok: '1',
      bad: '%E0%A4%A',
    });
  });

  it('conserva la primera aparición de una cookie repetida', () => {
    expect(parseCookieHeader('a=1; a=2')).toEqual({ a: '1' });
  });
});

// Глобальные объявления типов для CSS-файлов (side-effect импорты)
// Нужно для TypeScript 5.8+ (error 2882) при импорте .css из node_modules
declare module '*.css';
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.scss';
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

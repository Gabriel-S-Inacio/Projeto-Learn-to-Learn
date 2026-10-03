import { Book, Check, Ear, Headphones, Message, Notebook, Repeat, Search, Sliders, Target } from '../assets/icons/Icons'

export const benefits = [
  { icon: Book, title: 'Exposição com contexto' },
  { icon: Target, title: 'Prática possível' },
  { icon: Message, title: 'Autonomia real' },
]

export const methodSteps = [
  {
    index: '01',
    icon: Search,
    title: 'Observe',
    text: 'Perceba os padrões que fazem o inglês funcionar em situações reais.',
    longText: 'Antes de tentar produzir tudo, você precisa perceber como a língua aparece em contexto.',
    subtitle: 'Encontre padrões',
  },
  {
    index: '02',
    icon: Ear,
    title: 'Pratique',
    text: 'Transforme o que encontrou em uma rotina pequena e consistente.',
    longText: 'Uma boa prática não ocupa a sua vida: ela encontra um lugar nela e volta com consistência.',
    subtitle: 'Transforme em hábito',
  },
  {
    index: '03',
    icon: Message,
    title: 'Use',
    text: 'Comunique antes de estar pronto e aprenda no processo.',
    longText: 'O uso real dá propósito ao que você aprendeu e revela o que merece mais atenção.',
    subtitle: 'Dê vida ao idioma',
  },
]

export const methodPillarIcons = [Target, Repeat, Message]
export const journeyIcons = [Ear, Repeat, Message]

export const homeContents = [
  { label: 'Comece aqui', title: 'O mapa da sua jornada', icon: Target, tone: 'soft' },
  { label: 'Aulas', title: 'Contexto antes da regra', icon: Book, tone: 'olive' },
  { label: 'Ferramentas', title: 'Crie uma rotina possível', icon: Check, tone: 'green' },
]

export const contentCategories = [
  {
    icon: Book,
    title: 'Aulas',
    description: 'Encontros guiados por contexto, diálogo e construção de repertório.',
    items: ['Aulas individuais', 'Materiais de apoio', 'Feedback com direção'],
  },
  {
    icon: Headphones,
    title: 'Materiais',
    description: 'Textos, áudios e referências que expandem sua relação com a língua.',
    items: ['Leituras graduadas', 'Escuta com propósito', 'Conteúdo do seu interesse'],
  },
  {
    icon: Notebook,
    title: 'Ferramentas',
    description: 'Sistemas simples para transformar intenção em uma rotina possível.',
    items: ['Mapa de estudos', 'Revisão espaçada', 'Registro de progresso'],
  },
]

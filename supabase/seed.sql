-- Seed professor data — run after schema.sql

insert into public.professors (name, title, department, school, research_interests, email) values

-- MIT
('Dr. Sarah Chen', 'Associate Professor', 'Computer Science', 'MIT',
  ARRAY['machine learning', 'natural language processing', 'large language models'],
  'schen@csail.mit.edu'),
('Dr. James Park', 'Professor', 'Electrical Engineering', 'MIT',
  ARRAY['robotics', 'control systems', 'autonomous systems'],
  'jpark@mit.edu'),
('Dr. Maria Rodriguez', 'Assistant Professor', 'Biology', 'MIT',
  ARRAY['computational biology', 'genomics', 'bioinformatics'],
  'mrodriguez@mit.edu'),
('Dr. Kevin Thompson', 'Professor', 'Physics', 'MIT',
  ARRAY['quantum computing', 'quantum information', 'condensed matter physics'],
  'kthompson@mit.edu'),
('Dr. Lisa Anderson', 'Associate Professor', 'Earth Sciences', 'MIT',
  ARRAY['climate modeling', 'atmospheric science', 'environmental data science'],
  'landerson@mit.edu'),

-- Stanford
('Dr. Robert Kim', 'Professor', 'Computer Science', 'Stanford',
  ARRAY['computer vision', 'deep learning', 'image recognition'],
  'rkim@cs.stanford.edu'),
('Dr. Emily Watson', 'Assistant Professor', 'Bioengineering', 'Stanford',
  ARRAY['protein folding', 'structural biology', 'computational biochemistry'],
  'ewatson@stanford.edu'),
('Dr. David Martinez', 'Associate Professor', 'Economics', 'Stanford',
  ARRAY['algorithmic economics', 'mechanism design', 'market design'],
  'dmartinez@stanford.edu'),
('Dr. Jennifer Liu', 'Professor', 'Psychology', 'Stanford',
  ARRAY['human-computer interaction', 'cognitive science', 'UX research'],
  'jliu@stanford.edu'),
('Dr. Michael Brown', 'Associate Professor', 'Chemistry', 'Stanford',
  ARRAY['drug discovery', 'computational chemistry', 'machine learning for molecules'],
  'mbrown@stanford.edu'),

-- UC Berkeley
('Dr. Amanda Foster', 'Professor', 'EECS', 'UC Berkeley',
  ARRAY['distributed systems', 'cloud computing', 'operating systems'],
  'afoster@eecs.berkeley.edu'),
('Dr. Christopher Lee', 'Associate Professor', 'Statistics', 'UC Berkeley',
  ARRAY['causal inference', 'data science', 'statistical learning'],
  'clee@stat.berkeley.edu'),
('Dr. Patricia Williams', 'Assistant Professor', 'Neuroscience', 'UC Berkeley',
  ARRAY['brain-computer interfaces', 'neural engineering', 'cognitive neuroscience'],
  'pwilliams@berkeley.edu'),
('Dr. Thomas Davis', 'Professor', 'Materials Science', 'UC Berkeley',
  ARRAY['smart materials', 'nanotechnology', 'energy storage materials'],
  'tdavis@berkeley.edu'),
('Dr. Rachel Green', 'Associate Professor', 'Public Health', 'UC Berkeley',
  ARRAY['health equity', 'epidemiology', 'data science in public health'],
  'rgreen@berkeley.edu');

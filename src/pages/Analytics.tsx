import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Target, TrendingUp, Zap, Clock } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const weekData = [
  { day: 'Mon', focus: 120, tasks: 4 },
  { day: 'Tue', focus: 180, tasks: 6 },
  { day: 'Wed', focus: 90, tasks: 3 },
  { day: 'Thu', focus: 240, tasks: 8 },
  { day: 'Fri', focus: 150, tasks: 5 },
  { day: 'Sat', focus: 60, tasks: 2 },
  { day: 'Sun', focus: 0, tasks: 0 },
];

const monthData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  rate: Math.floor(Math.random() * 40) + 60, // Mock completion rate
}));

export default function Analytics() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Productivity Analytics</h2>
        <p className="text-muted-foreground mt-1">Insights into your execution patterns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-16 h-16">
              <CircularProgressbar 
                value={82} 
                text="82%" 
                styles={buildStyles({
                  pathColor: `hsl(var(--primary))`,
                  textColor: `hsl(var(--foreground))`,
                  trailColor: `hsl(var(--muted))`,
                })}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">Great</p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> +5% this week
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Focus Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              14<span className="text-lg font-medium text-muted-foreground">h</span> 20<span className="text-lg font-medium text-muted-foreground">m</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> This week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              4<span className="text-lg font-medium text-muted-foreground">h</span> 15<span className="text-lg font-medium text-muted-foreground">m</span>
            </div>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> By AI delegation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deadline Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> 0 missed this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Focus History</CardTitle>
            <CardDescription>Total minutes of deep work per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
                />
                <Bar dataKey="focus" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
            <CardDescription>Number of executed tasks per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
                />
                <Line type="monotone" dataKey="tasks" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>30-Day Completion Trend</CardTitle>
          <CardDescription>Task completion rate percentage over the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={4} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
              />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

import type { WebinarData, WebinarProject } from '../types/webinar'

export class WebinarDataConverter {
  static toProject(webinarData: WebinarData, userId: string): Partial<WebinarProject> {
    return {
      userId,
      title: webinarData.title || webinarData.topic || 'Untitled Webinar',
      topic: webinarData.topic,
      targetAudience: webinarData.audience,
      durationMinutes: webinarData.duration,
      description: webinarData.description,
      aiTool: webinarData.aiTool,
      outline: webinarData.outline,
      template: webinarData.template,
      slides: webinarData.slides,
      voiceStyle: webinarData.voiceStyle,
      ttsProvider: webinarData.ttsProvider,
      script: webinarData.script,
      videoUrl: webinarData.videoUrl,
      exportUrls: webinarData.exportUrls
    }
  }

  static fromProject(project: WebinarProject): WebinarData {
    return {
      topic: project.topic,
      audience: project.targetAudience,
      duration: project.durationMinutes,
      description: project.description,
      aiTool: project.aiTool,
      title: project.title,
      outline: project.outline,
      template: project.template,
      slides: project.slides,
      voiceStyle: project.voiceStyle,
      ttsProvider: project.ttsProvider,
      script: project.script,
      videoUrl: project.videoUrl,
      exportUrls: project.exportUrls
    }
  }

  static merge(existing: WebinarData, updates: Partial<WebinarData>): WebinarData {
    return {
      ...existing,
      ...updates
    }
  }
}
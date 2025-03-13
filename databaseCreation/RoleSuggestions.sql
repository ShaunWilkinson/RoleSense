SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoleSuggestions](
	[reportId] [uniqueidentifier] NOT NULL,
	[userId] [uniqueidentifier] NOT NULL,
	[userName] [varchar](1024) NULL,
	[userPrincipalName] [varchar](1024) NULL,
	[userType] [varchar](30) NOT NULL,
	[assignedRole] [varchar](200) NOT NULL,
	[scope] [varchar](3000) NOT NULL,
	[scopeType] [varchar](36) NOT NULL,
	[roleRequired] [bit] NOT NULL,
	[requiredActions] [varchar](max) NOT NULL,
	[recommendedRole] [varchar](200) NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[RoleSuggestions]  WITH CHECK ADD FOREIGN KEY([reportId])
REFERENCES [dbo].[Reports] ([id])
GO

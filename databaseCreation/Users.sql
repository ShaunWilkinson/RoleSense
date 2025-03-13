SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[sub] [varchar](43) NOT NULL,
	[email] [varchar](254) NULL,
	[givenName] [varchar](64) NULL,
	[familyName] [varchar](64) NULL,
	[created] [int] NOT NULL,
	[lastActivity] [int] NOT NULL,
	[defaultTenant] [uniqueidentifier] NULL,
	[showBeginnerGuide] [bit] NOT NULL,
	[upn] [varchar](254) NULL
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
ALTER TABLE [dbo].[Users] ADD PRIMARY KEY CLUSTERED 
(
	[sub] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (NULL) FOR [email]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (datediff(second,'1970-01-01',getutcdate())) FOR [created]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (datediff(second,'1970-01-01',getutcdate())) FOR [lastActivity]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (NULL) FOR [defaultTenant]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [showBeginnerGuide]
GO

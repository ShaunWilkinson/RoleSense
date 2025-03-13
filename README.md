# RoleSense - Data-Driven Access Control for Azure
This solution allows for easily analysing Azure IAM Role Assignments and comparing them to Audit Logs directly from Azure or via a Log Analytics Workspace. This was originally planned to be a paid SaaS application, however due to being a new father and other commitments the plans for this have changed. As such I am completely open-sourcing the solution and welcome you to contribute to the product and to use it both personally and commercially.

You may not use any of the code found in this project to implement your own paid solution, but may commit changes to the original repository that remove billing requirements and/or improve the solution for anybody else tha may wish to use it.

A working example of the project is located at https://rolesense.org/

# Solution Design
The Solution is designed to run in tandem with the [RoleSense-ReportGeneration](https://github.com/ShaunWilkinson/RoleSense-ReportGeneration) repository which handles the back-end queuing and processing of report requests.